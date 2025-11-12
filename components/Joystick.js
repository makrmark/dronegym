import { useRef, useState, useEffect } from 'react'

export default function Joystick({ size=120, outer=80, onMove=()=>{}, axis='both', shape='circle' }){
  // adapt default sizes for landscape mobile (panorama) if user didn't override
  const isClient = typeof window !== 'undefined'
  if(isClient){
    try{
      const mq = window.matchMedia && window.matchMedia('(orientation: landscape)')
      if(mq && mq.matches){
        // increase joystick size slightly for landscape mobile
        size = Math.max(size, 140)
        outer = Math.max(outer, 96)
      }
    }catch(e){}
  }
  const ref = useRef()
  const knobRef = useRef()
  const dragging = useRef(false)
  const [pos, setPos] = useState({x:0,y:0})

  useEffect(()=>{
    onMove({x:pos.x/outer, y:pos.y/outer})
  },[pos.x,pos.y])

  function start(e){
    dragging.current = true
    move(e)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  function move(e){
    if(!dragging.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width/2
    const cy = rect.top + rect.height/2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const d = Math.hypot(dx,dy)
    const max = outer
    let nx = d > max ? (dx/d)*max : dx
    let ny = d > max ? (dy/d)*max : dy
    // constrain axis
    if(axis === 'x') ny = 0
    if(axis === 'y') nx = 0
    setPos({x: nx, y: ny})
  }

  function end(){
    dragging.current = false
    setPos({x:0,y:0})
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  // compute actual container dimensions so the center used in pointer math
  // matches the visual center used for the knob positioning
  // For rectangular (horizontal) joystick, make the track exactly twice the 'outer'
  // radius so allowed x movement is +/- outer, and keep the height slightly larger
  // than the knob so the rail looks slim.
  const actualWidth = shape === 'rect' ? outer * 2 : size
  const actualHeight = shape === 'rect' ? Math.max(44, Math.round(outer * 0.6)) : size

  return (
    <div
      ref={ref}
      onPointerDown={start}
      style={{
        width: actualWidth,
        height: actualHeight,
        borderRadius: shape === 'circle' ? '50%' : 12,
        display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none', overflow:'visible'
      }}
    >
      <div style={{
        width: actualWidth,
        height: actualHeight,
        borderRadius: shape === 'rect' ? 12 : '50%',
        background:'rgba(0,0,0,0.15)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <div ref={knobRef} style={{
          position:'absolute', left:`calc(50% + ${pos.x}px - 18px)`, top:`calc(50% + ${pos.y}px - 18px)`,
          width:36, height:36, borderRadius:18, background:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  )
}
