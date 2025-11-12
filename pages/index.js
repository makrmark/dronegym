import Link from 'next/link'

export default function Home() {
  return (
    <div className="page center">
      <h1>DroneSim</h1>
      <p>Select a mission to fly</p>

      <div className="mission-list">
        <div className="mission-card">
          <h3>Mission 1 — Circle the Target</h3>
          <p>Keep the ground target in the cross-hairs while you circle.</p>
          <Link href="/mission/1"><button className="btn">Select</button></Link>
        </div>
      </div>

      <footer style={{marginTop:32,fontSize:12,opacity:0.8}}>
        Built with Three.js and Next.js — exportable to GitHub Pages
      </footer>
    </div>
  )
}
