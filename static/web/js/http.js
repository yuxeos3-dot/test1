define(['jquery', 'lib/crypto', 'utils', 'zui'], function ($, CryptoJS, utils) {
  const key = CryptoJS.enc.Utf8.parse('2acf7e91e9864673')
  const iv = CryptoJS.enc.Utf8.parse('1c29882d3ddfcfd6')

  function Decrypt(base64Data) {
    const decrypt = CryptoJS.AES.decrypt(base64Data, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    const plaintext = decrypt.toString(CryptoJS.enc.Utf8)
    return JSON.parse(plaintext.toString())
  }

  function http(config = {}) {
    return new Promise((resolve, reject) => {
      const default_config = {
        method: 'POST',
        dataType: 'json'
      }
      const { _options = {}, crypto, url, ...rest } = config
      const { data } = rest
      // console.log('api_domain: ', api_domain)
      $.ajax({
        // url: `${api_domain}${url}`,
        url: `${url}`,
        ...default_config,
        ...rest,
        data: {
          ...data,
          oauth_id: utils.getCookie('OAUTH_ID')
        },
        success: function (res) {
          if (crypto) {
            const data = Decrypt(res.data)
            console.log('data: ', data)
            if (data.status === 1) {
              if (_options.original) {
                return resolve(data)
              }
              resolve(data.data)
              if (_options.showSuccess) {
                new $.zui.Messager(data.msg || data.data.msg, {
                  time: 3000,
                  type: 'success',
                  close: false
                }).show()
              }
            } else if (data.status === 403) {
              const { showLogin = true } = _options
              if (showLogin) {
                $('#login_modal').modal({
                  position: 'center',
                  show: true,
                  backdrop: 'static'
                })
              }
              utils.remove_token()
              reject(data.msg)
            } else {
              reject(data.msg)
              if (_options.showError) {
                new $.zui.Messager(data.msg, {
                  time: 3000,
                  type: 'danger',
                  close: false
                }).show()
              }
            }
          } else {
            const code = res.code
            if (code === 200) {
              if (_options.showSuccess) {
                new $.zui.Messager(res.msg, {
                  time: 3000,
                  type: 'success',
                  close: false
                }).show()
              }
              if (_options.original) {
                return resolve(res)
              }
              resolve(res.data)
            } else if (code === 403) {
              const { showLogin = true } = _options
              if (showLogin) {
                $('#login_modal').modal({
                  position: 'center',
                  show: true,
                  backdrop: 'static'
                })
              }
              utils.remove_token()
              reject(res.msg)
            } else {
              reject(res.msg)

              if (_options.showError) {
                new $.zui.Messager(res.msg, {
                  time: 3000,
                  type: 'danger',
                  close: false
                }).show()
              }
            }
          }
        },
        error: function (xhr, status, error) {
          new $.zui.Messager(error.toString(), {
            time: 3000,
            type: 'danger',
            close: false
          }).show()
          reject(error)
        }
      })
    })
  }

  return http
})
