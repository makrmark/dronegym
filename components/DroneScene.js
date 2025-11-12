import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function Drone({ leftControl, rightControl, cameraControl, onCameraPitchChange, isFlying }){
  const ref = useRef()
  // state: position, yaw, horizontal velocity, vertical velocity
  const state = useRef({
    // start on the ground at altitude 0
    pos: new THREE.Vector3(0, 0, 6),
    yaw: 0,
    vel: new THREE.Vector3(0,0,0),
    vy: 0,
    targetAlt: 0,
    cameraTargetPitch: 0, // degrees (0..90)
    cameraPitch: 0
  })

  useFrame((_, dt) => {
    const s = state.current

    // control inputs are proportional in range approx -1..1
    const l = leftControl || {x:0,y:0}
    const r = rightControl || {x:0,y:0}

  // map joystick axes to controls
  // Left joystick: x -> yaw rate, y -> altitude (joystick up -> positive y -> ascend)
  // reduced yaw rate to make rotations less sensitive
  const maxYawRate = 0.5 // rad/s (halved again from 1.0)
    const maxVertSpeed = 3.5 // m/s

  // invert yaw so left/right joystick direction matches user preference
  const yawInput = -(l.x || 0)
  // left joystick Y: pushing forward/up results in ascending
  const vertInput = (l.y || 0)

  // Controls are inactive when on the ground (isFlying === false)
  const allowControl = !!isFlying

  // yaw only when flying
  const yawRateCmd = allowControl ? (yawInput * maxYawRate) : 0
  s.yaw += yawRateCmd * dt

  // Right joystick: y -> forward/back, x -> right/left (in drone local frame)
  const maxHoriz = 4.0 // m/s
  const forwardInput = (r.y || 0)
  const rightInput = -(r.x || 0)

    // compute local forward and right vectors from yaw
    const yaw = s.yaw
    const forwardVec = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    const rightVec = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))

    // desired horizontal velocity from joystick (proportional)
    const desiredVel = new THREE.Vector3()
    if(allowControl){
      desiredVel.addScaledVector(forwardVec, forwardInput * maxHoriz)
      desiredVel.addScaledVector(rightVec, rightInput * maxHoriz)
    }

    // smooth horizontal velocity (simple lerp)
    s.vel.lerp(desiredVel, Math.min(1, 6 * dt))

    // apply horizontal movement
    s.pos.addScaledVector(s.vel, dt)

    // vertical velocity smoothing

    // Vertical control behavior:
    // - When not flying: drone returns to ground (0) and controls disabled.
    // - When takeoff occurs, targetAlt will be set to at least 1m. While flying the pilot can
    //   push the left joystick up/down to change the target altitude. Releasing the joystick
    //   holds that altitude. Target altitude is clamped between 1m and 10m.
    const groundAlt = 0
    const minFlightAlt = 1.0
    const maxFlightAlt = 10.0
    const climbRate = 2.5 // m/s change to target per full joystick deflection

    // initialize targetAlt on first takeoff
    if(allowControl && s.targetAlt < minFlightAlt){
      s.targetAlt = Math.max(minFlightAlt, s.pos.y || minFlightAlt)
    }

    let desiredVy = 0
    if(allowControl){
      // if pilot is commanding vertical movement, adjust the target altitude proportional to input
      const dead = Math.abs(vertInput) < 0.05
      if(!dead){
        // integrate desired altitude change
        s.targetAlt += vertInput * climbRate * dt
        // clamp to allowable flight envelope
        s.targetAlt = Math.max(minFlightAlt, Math.min(maxFlightAlt, s.targetAlt))
        // velocity commanded toward target altitude (we'll smooth toward it below)
        const altError = s.targetAlt - s.pos.y
        const altHoldGain = 4.0
        desiredVy = altError * altHoldGain
      } else {
        // no input: hold current target altitude
        const altError = s.targetAlt - s.pos.y
        const altHoldGain = 4.0
        desiredVy = altError * altHoldGain
      }
    } else {
      // when not allowed control (grounded), pull to ground
      const pull = (groundAlt - s.pos.y) * Math.min(1, 8 * dt)
      desiredVy = s.vy + pull
      // also reset targetAlt to zero while grounded
      s.targetAlt = 0
      // when grounded, also return the camera gimbal to level
      s.cameraTargetPitch = 0
    }

    s.vy += (desiredVy - s.vy) * Math.min(1, 6 * dt)

    s.pos.y += s.vy * dt

    // simple ground clamp: drone rests on ground at y=0
    if(s.pos.y <= 0){
      s.pos.y = 0
      s.vy = 0
      // ensure horizontal velocity is stopped when on ground
      s.vel.set(0,0,0)
    }

    // yaw rate estimate
    if(s.prevYaw === undefined) s.prevYaw = s.yaw
    const yawRateEst = (s.yaw - s.prevYaw) / Math.max(dt, 1e-6)
    s.prevYaw = s.yaw
    s.yawRate = yawRateEst

    // update mesh/group
    if(ref.current){
      ref.current.position.copy(s.pos)
      ref.current.rotation.y = s.yaw
    }

  // camera gimbal control: cameraControl.x moves left/right -> we map x to pitch changes
    // right (positive x) -> camera rotates upward (toward 0), left (negative) -> down (toward 90)
    const camInput = cameraControl?.x || 0
    const camRate = 30 // degrees per second per full deflection
    // integrate target pitch when control active
    if(isFlying){
      if(Math.abs(camInput) > 0.02){
        s.cameraTargetPitch += (-camInput) * camRate * dt
        // clamp
        s.cameraTargetPitch = Math.max(0, Math.min(90, s.cameraTargetPitch))
      }
    }

    // smooth camera pitch toward target
    s.cameraPitch += (s.cameraTargetPitch - s.cameraPitch) * Math.min(1, 8 * dt)

    // report camera pitch back in degrees
    if(typeof onCameraPitchChange === 'function') onCameraPitchChange(s.cameraPitch)
    // apply camera pitch rotation to the camera gimbal mesh if present
    if(ref.current){
      const gimbal = ref.current.getObjectByName('CameraGimbal')
      if(gimbal){
        const pitchRad = THREE.MathUtils.degToRad(s.cameraPitch)
        // gimbal initial orientation points forward along +Z; rotate around local X to pitch down
        gimbal.rotation.x = pitchRad
      }
    }
  })

  // build a simple quadcopter: central body + four arms + simple props + front arrow
  return (
    <group ref={ref} name="DroneRoot">
      {/* central body */}
      <mesh position={[0,0,0]}>
        <boxGeometry args={[0.6,0.18,0.6]} />
        <meshStandardMaterial color="#1565C0" />
      </mesh>

      {/* four diagonal arms extending from corners: create groups rotated 45deg and place arm mesh along local Z */}
      {([45,135,225,315]).map((deg, i) => {
        const rad = deg * Math.PI/180
        // arm length: extend from center out to the prop distance (so arm end near prop)
        const propDist = 0.9
        const armLen = propDist
        // prop will be placed at the arm end (local z = armLen)
        return (
          <group key={i} rotation-y={rad}>
            <mesh position={[0,0,armLen/2]}>
              <boxGeometry args={[0.02,0.02,armLen]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            {/* propeller at arm end, slightly overlapping the arm (flat disc parallel to ground) */}
            <mesh position={[0,0.02,armLen]}>
              <cylinderGeometry args={[0.14,0.14,0.02,12]} />
              <meshStandardMaterial color="#444" />
            </mesh>
          </group>
        )
      })}

      {/* front camera cylinder (black) pointing forward (+Z); will pitch with s.cameraPitch */}
      <group name="CameraGimbal" position={[0,0.06,0.45]}>
        <mesh name="CameraBody" rotation-x={Math.PI/2}>
          {/* chunkier camera body */}
          <cylinderGeometry args={[0.12,0.12,0.5,16]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      </group>

    </group>
  )
}

export default function DroneScene({ leftControl = {x:0,y:0}, rightControl={x:0,y:0}, cameraControl={x:0,y:0}, cameraPitch=0, onCameraPitchChange=()=>{}, onCrosshairPosition=()=>{}, isFlying=false }){
  const [telemetry, setTelemetry] = useState({alt:0, heading:0, velF:0, velR:0, yawRate:0})

  // create a soft blurred shadow texture using an offscreen canvas
  const shadowTexture = useMemo(()=>{
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // draw radial gradient (black center -> transparent edge)
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
    grd.addColorStop(0, 'rgba(0,0,0,0.85)')
    grd.addColorStop(0.4, 'rgba(0,0,0,0.45)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0,0,size,size)

    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <div style={{width:'100%', height:'100%', position:'relative'}}>
      <Canvas camera={{position:[0,6,10], fov:50}}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5,10,5]} intensity={1} />

        <mesh rotation-x={-Math.PI/2} position={[0,0,0]}>
          <planeGeometry args={[200,200]} />
          <meshStandardMaterial color="#7BBF6A" />
        </mesh>

        {/* subtle grid to help perceive motion and rotation */}
        <gridHelper args={[200, 40, '#223322', '#1a6530']} position={[0,0,0]} />

        {/* target marker placed in front of the drone at startup (10m ahead) and protruding 1m above ground */}
        <mesh position={[0,0.5,16]}>
          <cylinderGeometry args={[0.2,0.2,1.0,16]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>

  <Drone leftControl={leftControl} rightControl={rightControl} cameraControl={cameraControl} onCameraPitchChange={onCameraPitchChange} isFlying={isFlying} />

        {/* soft blob shadow projected on ground — updated each frame by TelemetryReader */}
        <mesh name="DroneShadow" rotation-x={-Math.PI/2} position={[0,0.01,0]}>
          <planeGeometry args={[1.5,1.5]} />
          <meshBasicMaterial map={shadowTexture} transparent={true} opacity={0.6} depthWrite={false} />
        </mesh>

        {/* camera follow controller */}
        <CameraFollow />

  {/* project the actual gimbal forward into screen space so the UI crosshair can be positioned */}
  <CrosshairProjector onPos={onCrosshairPosition} />

        {/* telemetry updater: reads drone state by name */}
        <TelemetryReader setTelemetry={setTelemetry} />

        <OrbitControls enabled={false} />
      </Canvas>

      <div className="telemetry hud-panel">
        <div><strong>Altitude:</strong> {telemetry.alt.toFixed(2)} m</div>
        <div><strong>Heading:</strong> {telemetry.heading.toFixed(1)}°</div>
        <div><strong>Forward Vel:</strong> {telemetry.velF.toFixed(2)} m/s</div>
        <div><strong>Right Vel:</strong> {telemetry.velR.toFixed(2)} m/s</div>
        <div><strong>Yaw Rate:</strong> {telemetry.yawRate.toFixed(2)} rad/s</div>
        <div><strong>Gimbal:</strong> {Number.isFinite(cameraPitch) ? cameraPitch.toFixed(1) : '0.0'}°</div>
      </div>
    </div>
  )
}

function TelemetryReader({ setTelemetry }){
  useFrame((state, dt)=>{
    const drone = state.scene.getObjectByName('DroneRoot')
    if(!drone) return

    // derive forward/right vectors from drone.rotation.y
    const yaw = drone.rotation.y
    const forwardVec = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    const rightVec = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))

    // velocity approximation: compare current and previous position
    if(!drone.userData.prevPos) drone.userData.prevPos = drone.position.clone()
    const prev = drone.userData.prevPos
    const delta = new THREE.Vector3().subVectors(drone.position, prev)
    const vx = delta.dot(forwardVec) / Math.max(dt, 1e-6)
    const vr = delta.dot(rightVec) / Math.max(dt, 1e-6)
    const yawRate = (drone.userData.prevYaw !== undefined) ? (drone.rotation.y - drone.userData.prevYaw)/Math.max(dt,1e-6) : 0

    drone.userData.prevPos.copy(drone.position)
    drone.userData.prevYaw = drone.rotation.y

    setTelemetry({
      alt: drone.position.y,
      heading: ((drone.rotation.y * 180/Math.PI) + 360) % 360,
      velF: isFinite(vx) ? vx : 0,
      velR: isFinite(vr) ? vr : 0,
      yawRate: isFinite(yawRate) ? yawRate : 0
    })
    // update shadow if present
    const shadow = state.scene.getObjectByName('DroneShadow')
    if(shadow){
      const alt = drone.position.y
      shadow.position.set(drone.position.x, 0.01, drone.position.z)
      const scale = 1 + Math.min(3, alt * 0.4)
      shadow.scale.set(scale, scale, scale)
      if(shadow.material) shadow.material.opacity = Math.max(0.06, 1 - alt * 0.6)
    }
  })
  return null
}

function CameraFollow(){
  // Over-the-shoulder camera that follows the drone and looks forward
  useFrame((state, dt)=>{
    const cam = state.camera
    const drone = state.scene.getObjectByName('DroneRoot')
    if(!drone) return
    const yaw = drone.rotation.y
    // read camera pitch from drone userData if available
    const gimbal = drone.getObjectByName('CameraGimbal')
    const cameraPitch = (gimbal && gimbal.rotation.x) ? gimbal.rotation.x : 0
    // We want the virtual camera to behave as if it's mounted behind the real drone camera
    // and to rotate around that camera when the gimbal pitches. To achieve that we:
    //  - compute the gimbal's world position and forward direction
    //  - place the virtual camera behind the gimbal along the negative forward vector
    //  - apply a small lateral/vertical shoulder offset
    //  - compute a "virtual" pitch mapping so that when the gimbal is 0deg the
    //    virtual camera uses an offset angle (e.g. -15deg) and when the gimbal is 90deg
    //    the virtual camera also points 90deg down. This is a simple linear map:
    //      virtualDeg = gimbalDeg * scale + offsetDeg
    //    where scale = (90 - offsetDeg)/90 so the endpoints match.

    const desiredPos = new THREE.Vector3()
    const lookAtPoint = new THREE.Vector3()

      if(gimbal){
        // Map gimbal pitch to a virtual camera pitch that starts at +15deg when gimbal=0
        // (i.e. camera looks slightly down onto the drone) and reaches 90deg when
        // gimbal is 90deg. Angles are positive downwards.
        const gimbalPitchRad = gimbal.rotation.x || 0
        const gimbalPitchDeg = THREE.MathUtils.radToDeg(gimbalPitchRad)
        const offsetDeg = 15 // when gimbal is 0deg, virtual camera looks 15deg down
        const scale = (90 - offsetDeg) / 90
        const virtualPitchDeg = gimbalPitchDeg * scale + offsetDeg
        const virtualPitchRad = THREE.MathUtils.degToRad(virtualPitchDeg)

        // compute a camera position that is directly behind the drone center at the
        // requested inclination. We place the camera at spherical coords relative to
        // the drone: distance = followDistance, horizontal backing = cos(theta),
        // vertical = sin(theta).
        const followDistance = 4.0
        const forwardHoriz = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize()

        // camera offset relative to drone center
        const horizBack = forwardHoriz.clone().multiplyScalar(-followDistance * Math.cos(virtualPitchRad))
        const upOffset = followDistance * Math.sin(virtualPitchRad)

        desiredPos.copy(drone.position)
        desiredPos.add(horizBack)
        desiredPos.add(new THREE.Vector3(0, upOffset, 0))

        // compute lookAt target: use the actual gimbal forward (true camera aim)
        const q = new THREE.Quaternion()
        gimbal.getWorldQuaternion(q)
        const gimbalForward = new THREE.Vector3(0,0,1).applyQuaternion(q).normalize()
        const gimbalWorldPos = new THREE.Vector3()
        gimbal.getWorldPosition(gimbalWorldPos)
        const frontAimDist = 8.0
        lookAtPoint.copy(gimbalWorldPos).addScaledVector(gimbalForward, frontAimDist)
    } else {
      // fallback to prior behavior if gimbal not present
      const localOffset = new THREE.Vector3(0.6, 1.6, -4)
      const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0), yaw)
      desiredPos.addVectors(drone.position, worldOffset)
      cam.position.lerp(desiredPos, Math.min(1, 4 * dt))
      const forwardHoriz = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
      const pitch = cameraPitch // radians, positive down
      const dir = new THREE.Vector3(
        forwardHoriz.x * Math.cos(pitch),
        -Math.sin(pitch),
        forwardHoriz.z * Math.cos(pitch)
      )
      const fallbackLookAt = new THREE.Vector3().addVectors(drone.position, dir.multiplyScalar(4)).add(new THREE.Vector3(0,0.6,0))
      cam.lookAt(fallbackLookAt)
      return
    }

    // smooth camera movement
    cam.position.lerp(desiredPos, Math.min(1, 4 * dt))
    cam.lookAt(lookAtPoint)
  })
  return null
}

function CrosshairProjector({ onPos = ()=>{} }){
  // projects the real gimbal forward direction (where the drone camera points)
  // into screen space and reports CSS percentage coordinates to the parent via onPos
  useFrame((state)=>{
    const drone = state.scene.getObjectByName('DroneRoot')
    if(!drone) return
    const gimbal = drone.getObjectByName('CameraGimbal')
    if(!gimbal) return

    const cam = state.camera
    const size = state.size

    // real gimbal world pos and forward (actual camera direction)
    const gimbalWorldPos = new THREE.Vector3()
    gimbal.getWorldPosition(gimbalWorldPos)
    const q = new THREE.Quaternion()
    gimbal.getWorldQuaternion(q)
    const gimbalForward = new THREE.Vector3(0,0,1).applyQuaternion(q).normalize()

    // pick a point a bit out in front of the gimbal along its true forward vector
    const projDist = 30
    const targetWorld = gimbalWorldPos.clone().addScaledVector(gimbalForward, projDist)

    // project to normalized device coords
    const ndc = targetWorld.clone().project(cam)
    // convert to CSS percent coordinates relative to canvas
    const leftPct = (ndc.x * 0.5 + 0.5) * 100
    const topPct = (-ndc.y * 0.5 + 0.5) * 100

    // if behind camera, we can choose to hide by sending nulls; but for now send clamped values
    onPos({ left: Math.min(100, Math.max(0, leftPct)), top: Math.min(100, Math.max(0, topPct)), onScreen: ndc.z >= -1 && ndc.z <= 1 })
  })
  return null
}
