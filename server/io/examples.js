export default function Svc(socket, io) {
  return Object.freeze({
    getProgress({ period }) {
      return new Promise((resolve) => {
        let progress = 0
        const timer = setInterval(() => {
          progress += 10
          socket.emit('progress', { data: progress })
          if (progress === 100) {
            clearInterval(timer)
            resolve({ data: progress })
          }
        }, period)
      })
    },
    echoBack(msg) {
      const { evt = 'echoBack', data } = msg || {}
      socket.emit(evt, data)
      return { evt, data }
    },
    echoHello(data) {
      return { evt: 'echoHello', data: 'hello' }
    },
    echoError({ evt, data }) {
      throw new Error('ExampleError')
    },
    'examples/sample'({ data: sample }) {
      socket.emit('sampleDataRxd', {
        data: {
          msg: 'Sample data rxd on state change',
          sample
        }
      })
    },
    'examples/someObj'({ data }){
      return { msg: 'ok' }
    },
    sample2({ data: sample }) {
      socket.emit('sample2DataRxd', {
        data: {
          msg: 'Sample2 data rxd on state change',
          sample
        }
      })
    },
    sample2b({ data: sample }) {
      socket.emit('sample2bDataRxd', {
        data: {
          msg: 'Sample2b data rxd on state change',
          sample
        }
      })
    },
    sample3(data) {
      const sample = data || 'undef'
      return {
        msg: 'rxd sample ' + sample
      }
    },
    sample4({ data: sample }) {
      return {
        msg: 'rxd sample ' + sample
      }
    },
    sample5({ data: sample }) {
      return {
        msg: 'rxd sample ' + sample
      }
    },
    receiveArray(msg) {
      return {
        resp: 'Received array',
        length: msg.length
      }
    },
    receiveArray2(msg) {
      return {
        resp: 'Received array2',
        msg
      }
    },
    receiveString(msg) {
      return {
        resp: 'Received string',
        length: msg.length
      }
    },
    receiveString2(msg) {
      return {
        resp: 'Received string again',
        length: msg.length
      }
    },
    receiveUndef(msg) {}
  })
}
