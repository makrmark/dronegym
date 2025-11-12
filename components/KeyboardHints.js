import { useEffect, useState } from 'react'

export default function KeyboardHints(){
  const [visible, setVisible] = useState(false)
  useEffect(()=>{
    let seen = false
    function onKey(e){
      // ignore modifier-only presses
      if(e.key && e.key.length === 1 || e.code.startsWith('Key') || e.code.startsWith('Arrow') || ['KeyQ','KeyE','KeyT','KeyM'].includes(e.code)){
        if(!seen){
          seen = true
          setVisible(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[])

  if(!visible) return null
  return (
    <div className="keyboard-hints" role="status" aria-live="polite">
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <div style={{fontWeight:700}}>Keyboard Controls</div>
        <button className="btn small" onClick={()=>setVisible(false)}>Dismiss</button>
      </div>
      <div style={{marginTop:8}}>W/S — Altitude  •  A/D — Yaw</div>
      <div>Arrow Keys — Move (forward/back/left/right)</div>
      <div>Q / E — Camera gimbal</div>
      <div>T — Takeoff / Land  •  M — Flight Mode</div>
    </div>
  )
}
