import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Joystick from '../../components/Joystick'
import KeyboardHints from '../../components/KeyboardHints'

const DroneScene = dynamic(() => import('../../components/DroneScene'), { ssr: false })

export default function MissionPage() {
  const [left, setLeft] = useState({x:0,y:0}) // yaw control
  const [right, setRight] = useState({x:0,y:0}) // sideslip control
  const [cameraControl, setCameraControl] = useState({x:0,y:0})
  const [cameraPitch, setCameraPitch] = useState(0) // degrees, 0..90
  const [isFlying, setIsFlying] = useState(false)
  const [missionActive, setMissionActive] = useState(false)
  const [crossPos, setCrossPos] = useState({left:50, top:50, onScreen:true})
  const [flightMode, setFlightMode] = useState('Normal') // 'Normal' | 'Cine'
  // allow keyboard control state
  const keysRef = useRef(new Set())

  useEffect(()=>{
    function isTyping(e){
      const t = e.target
      if(!t) return false
      const tag = (t.tagName || '').toUpperCase()
      return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable
    }

    function updateAxesFromKeys(){
      // leftControl: WASD -> yaw/altitude
      const newLeft = {x:0,y:0}
      if(keysRef.current.has('KeyA')) newLeft.x -= 1
      if(keysRef.current.has('KeyD')) newLeft.x += 1
      if(keysRef.current.has('KeyW')) newLeft.y -= 1
      if(keysRef.current.has('KeyS')) newLeft.y += 1

      // rightControl: Arrow keys -> move
      const newRight = {x:0,y:0}
      if(keysRef.current.has('ArrowLeft')) newRight.x -= 1
      if(keysRef.current.has('ArrowRight')) newRight.x += 1
      if(keysRef.current.has('ArrowUp')) newRight.y -= 1
      if(keysRef.current.has('ArrowDown')) newRight.y += 1

      // cameraControl: Q/E -> x axis
      const newCam = {x:0,y:0}
      if(keysRef.current.has('KeyQ')) newCam.x -= 1
      if(keysRef.current.has('KeyE')) newCam.x += 1

      // apply
      setLeft(newLeft)
      setRight(newRight)
      setCameraControl(newCam)
    }

    function onKeyDown(e){
      if(isTyping(e)) return
      // prevent repeating toggle actions
      if(e.code === 'KeyT' || e.code === 'KeyM'){
        if(e.repeat) return
      }

      switch(e.code){
        case 'KeyT':
          // toggle takeoff/land
          if(isFlying){ handleLand() } else { handleTakeOff() }
          break
        case 'KeyM':
          setFlightMode(fm => fm === 'Normal' ? 'Cine' : 'Normal')
          break
        default:
          // movement keys: add to set and update axes
          keysRef.current.add(e.code)
          updateAxesFromKeys()
          break
      }
    }

    function onKeyUp(e){
      if(isTyping(e)) return
      // remove key from set and update axes
      keysRef.current.delete(e.code)
      updateAxesFromKeys()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return ()=>{
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isFlying])

  function handleTakeOff(){
    setIsFlying(true)
    setMissionActive(true)
  }

  function handleLand(){
    setIsFlying(false)
    setMissionActive(false)
  }

  return (
    <div className="mission-page">
      <header className="topbar">
        <Link href="/"><button className="btn small">Back</button></Link>
        <div style={{flex:1,textAlign:'center'}}>Mission: Circle Target</div>
        <div style={{width:96}} />
      </header>

      <main className="scene-wrap">
        {/* apply flight mode scaling here so DroneScene always receives the effective control rates */}
        <DroneScene
          leftControl={{x: left.x * (flightMode === 'Cine' ? 0.5 : 1), y: left.y * (flightMode === 'Cine' ? 0.5 : 1)}}
          rightControl={{x: right.x * (flightMode === 'Cine' ? 0.5 : 1), y: right.y * (flightMode === 'Cine' ? 0.5 : 1)}}
          cameraControl={{x: cameraControl.x * (flightMode === 'Cine' ? 0.5 : 1), y: cameraControl.y * (flightMode === 'Cine' ? 0.5 : 1)}}
          cameraPitch={cameraPitch}
          onCameraPitchChange={(deg)=>setCameraPitch(deg)}
          onCrosshairPosition={(p)=>setCrossPos(p)}
          isFlying={isFlying}
        />

  <KeyboardHints />

  <div className="hud">
          <div className="crosshair" aria-hidden style={{left: `${crossPos.left}%`, top: `${crossPos.top}%`, transform:`translate(-50%,-50%) rotate(${cameraPitch}deg)`, opacity: crossPos.onScreen ? 1 : 0.15}}>+</div>

          {/* Left joystick: bottom-left */}
          <div className="joystick-left">
            <div className="joystick-box">
              <div className="label">Left — Yaw / Altitude</div>
              <Joystick onMove={v=>setLeft(v)} />
            </div>
          </div>

          {/* Right joystick: bottom-right */}
          <div className="joystick-right">
            <div className="joystick-box">
              <div className="label">Right — Move</div>
              <Joystick onMove={v=>setRight(v)} />
            </div>
          </div>

          {/* Camera gimbal joystick: top-right where HUD used to be */}
          <div className="joystick-camera">
            <div className="joystick-box">
              <div className="label">Camera Gimbal (L/R)</div>
              <Joystick axis="x" shape="rect" onMove={v=>setCameraControl(v)} />
            </div>
          </div>

          {/* Takeoff / Land button on left center */}
          <div className="takeoff-left">
            {!isFlying ? (
              <button className="btn takeoff" onClick={handleTakeOff}>Take Off</button>
            ) : (
              <button className="btn land" onClick={handleLand}>Land Now</button>
            )}
          </div>

          {/* Flight mode toggle on the right center */}
          <div className="flightmode-right">
            <div className="action-buttons">
              <div style={{marginRight:8}} className="label">Flight Mode</div>
              <button className="btn small" onClick={()=>setFlightMode(fm => fm === 'Normal' ? 'Cine' : 'Normal')}>{flightMode}</button>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
