import { useEffect, useRef } from 'react'
// Note: nipplejs accesses `window` and must only be loaded on the client.
// We dynamically import it inside useEffect so server-side builds won't try to
// evaluate it (which causes "window is not defined").

// A small wrapper around nipplejs that matches the previous simple Joystick API:
// Props:
// - onMove({x,y}) where x,y are in range [-1,1]
// - axis: 'both' | 'x' | 'y'
// - size: visual size (diameter) for circle shape
// - outer: maximum displacement radius in px (approx)
// - shape: 'circle' | 'rect' (rect only visual)
export default function Joystick({ size = 120, outer = 80, onMove = () => {}, axis = 'both', shape = 'circle' }){
  const zone = useRef(null)
  const managerRef = useRef(null)

  useEffect(()=>{
    if(!zone.current) return

    // import nipplejs only on the client
    let cancelled = false

    const calculatedSize = shape === 'rect' ? Math.max(96, Math.round(outer * 1.2)) : Math.max(size, outer*2)
    const opts = {
      zone: zone.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#ffffff',
      size: calculatedSize,
      restOpacity: 0.2,
      // lock movement to a single axis when requested
      lockX: axis === 'x',
      lockY: axis === 'y',
      multitouch: true
    }

    let manager = null
    ;(async ()=>{
      try{
        const mod = await import('nipplejs')
        const nipple = mod && (mod.default || mod)
        if(cancelled || !nipple) return
        manager = nipple.create(opts)
        managerRef.current = manager

        manager.on('move', (evt, data) => {
          if(!data || !data.distance) return
          const angle = data.angle && data.angle.radian ? data.angle.radian : 0
          const dist = data.distance || 0
          const max = (opts.size || (outer*2))/2 || outer

          const nx = Math.cos(angle) * Math.min(dist, max) / max
          const ny = Math.sin(angle) * Math.min(dist, max) / max

          let outX = nx
          let outY = ny
          if(axis === 'x') outY = 0
          if(axis === 'y') outX = 0

          const dead = 0.02
          if(Math.abs(outX) < dead) outX = 0
          if(Math.abs(outY) < dead) outY = 0

          onMove({ x: outX, y: outY })
        })

        manager.on('end', ()=>{
          onMove({ x:0, y:0 })
        })

      }catch(e){
        // swallow client-side import errors (optional)
        // console.warn('nipplejs failed to load', e)
      }
    })()

    return ()=>{
      cancelled = true
      try{ if(managerRef.current) managerRef.current.destroy() }catch(e){}
      managerRef.current = null
    }
  }, [zone.current, size, outer, axis])

  // Visual wrapper: we render a container matching the requested shape/size.
  const style = {
    width: shape === 'rect' ? outer * 2 : size,
    height: shape === 'rect' ? Math.max(44, Math.round(outer * 0.6)) : size,
    borderRadius: shape === 'rect' ? 12 : '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none',
    position: 'relative'
  }

  // inside the zone the nipplejs library will draw the visual joystick base
  // when shape is 'rect' render a horizontal track behind the nipple so the
  // user sees the allowed left/right movement area.
  return (
    <div ref={zone} style={style} className={`joystick-zone ${shape === 'rect' ? 'rect' : ''}`}>
      {shape === 'rect' && <div className="joystick-track" />}
    </div>
  )
}
