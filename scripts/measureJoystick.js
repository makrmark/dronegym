const puppeteer = require('puppeteer')

async function run(){
  const url = process.argv[2] || 'http://localhost:3000/mission/1'
  console.log('Launching browser...')
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']})
  console.log('Browser launched')
  const page = await browser.newPage()
  console.log('New page created')
  page.setViewport({width: 390, height: 844}) // typical phone portrait; gimbal is on top-left so portrait fine
  try{
  console.log('Navigating to', url)
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000})
  console.log('Navigation completed')

    // wait for joysticks to initialize (nipplejs creates elements)
    await page.waitForSelector('.joystick-zone', {timeout: 15000})

    const results = await page.evaluate(()=>{
      function rectOf(el){
        if(!el) return null
        const r = el.getBoundingClientRect()
        return {left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom)}
      }

      const zones = {
        cameraZone: document.querySelector('.joystick-camera .joystick-zone'),
        leftZone: document.querySelector('.joystick-left .joystick-zone'),
        rightZone: document.querySelector('.joystick-right .joystick-zone')
      }

      const out = {}
      for(const [k, zone] of Object.entries(zones)){
        out[k] = {
          zone: rectOf(zone),
          track: rectOf(zone ? zone.querySelector('.joystick-track') : null),
          nippleContainer: rectOf(zone ? zone.querySelector('.nipple') : null),
          nippleFront: rectOf(zone ? zone.querySelector('.nipple .front') : null),
          nippleBack: rectOf(zone ? zone.querySelector('.nipple .back') : null),
          innerHTML: zone ? zone.innerHTML : null
        }
      }

      // also measure the page safe-area insets container (body) and screen size
      out.screen = {w: window.innerWidth, h: window.innerHeight}
      return out
    })

    console.log(JSON.stringify(results, null, 2))
  }catch(e){
    console.error('ERROR', e.message)
    process.exitCode = 2
  }finally{
    await browser.close()
  }
}

run()
