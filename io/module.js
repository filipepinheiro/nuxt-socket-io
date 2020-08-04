/* eslint-disable standard/no-callback-literal */
/*
 * Copyright 2020 Richard Schloss (https://github.com/richardeschloss/nuxt-socket-io)
 */

import http from 'http'
import { existsSync } from 'fs'
import { resolve as pResolve } from 'path'
import { promisify } from 'util'
import consola from 'consola'
import socketIO from 'socket.io'
import Glob from 'glob'

const glob = promisify(Glob)

const register = {
  ioSvc(io, ioSvc, nspDir) {
    return new Promise((resolve, reject) => {
      const { default: Svc } = require(ioSvc)
      if (Svc && typeof Svc === 'function') {
        io.on('connection', (socket) => {
          const svc = Svc(socket, io)
          register.socket(svc, socket, '/')
        })
        resolve()
      } else {
        reject(
          new Error(
            `io service at ${ioSvc} does not export a default "Svc()" function. Not registering`
          )
        )
      }
    })
  },
  nspSvc(io, nspDir) {
    return new Promise(async (resolve, reject) => {
      const nspFiles = await glob(`${nspDir}/**/*.js`)
      const namespaces = nspFiles.map((f) => f.split(nspDir.replace(/\\/g,'/')[1].split('.js')[0])
      namespaces.forEach(async (namespace, idx) => {
        const { default: Svc } = await import(nspFiles[idx])
        if (Svc && typeof Svc === 'function') {
          io.of(`${namespace}`).on('connection', (socket) => {
            const svc = Svc(socket, io)
            register.socket(svc, socket, namespace)
          })
        } else {
          consola.info(
            `io service at ${nspDir}${namespace} does not export a default "Svc()" function. Not registering`
          )
        }
      })
      resolve()
    })
  },
  listener(server = http.createServer(), port = 3000, host = 'localhost') {
    return new Promise((resolve, reject) => {
      server
        .listen(port, host)
        .on('error', reject)
        .on('listening', () => {
          consola.info(`socket.io server listening on ${host}:${port}`)
          resolve(server)
        })
    })
  },
  server(options = {}, server = http.createServer()) {
    const {
      ioSvc = './server/io',
      nspDir = ioSvc,
      host = 'localhost',
      port = 3000
    } = options
    const ioSvcFull = pResolve(ioSvc.endsWith('.js') ? ioSvc : ioSvc + '.js')
    const nspDirFull = pResolve(
      nspDir.endsWith('.js') ? nspDir.substr(nspDir.length - 3) : nspDir
    )
    const io = socketIO(server)
    const svcs = { ioSvc: ioSvcFull, nspSvc: nspDirFull }
    const p = []
    Object.entries(svcs).forEach(([svcName, svc]) => {
      if (existsSync(svc)) {
        p.push(register[svcName](io, svc, nspDirFull))
      }
    })

    if (!server.listening) {
      p.push(register.listener(server, port, host))
    }
    return Promise.all(p).then(() => server)
  },
  socket(svc, socket, namespace) {
    consola.info('socket.io client connected to ', namespace)
    Object.entries(svc).forEach(([evt, fn]) => {
      if (typeof fn === 'function') {
        socket.on(evt, async (msg, cb = () => {}) => {
          try {
            const resp = await fn(msg)
            cb(resp)
          } catch (err) {
            cb({ emitError: err.message, evt })
          }
        })
      }
    })
    socket.on('disconnect', () => {
      consola.info('client disconnected from', namespace)
    })
  }
}

export default function nuxtSocketIO(moduleOptions) {
  const options = Object.assign({}, this.options.io, moduleOptions)

  if (options.server !== false) {
    this.nuxt.hook('listen', async (server = http.createServer()) => {
      await register.server(options.server, server).catch(consola.error)
      this.nuxt.hook('close', () => server.close())
    })
  }

  this.addPlugin({
    ssr: true,
    src: pResolve(__dirname, 'plugin.js'),
    fileName: 'nuxt-socket-io.js',
    options
  })
}

export { register }
