import { useState, useRef } from 'react';
import { Wifi } from 'lucide-react';

const Meteor3DCard = () => {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 8, y: -16 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // cursor position within element
    const y = e.clientY - rect.top;
    
    const px = x / rect.width;
    const py = y / rect.height;
    
    // Rotate card based on cursor coordinates (max tilt 20 degrees)
    const rotateX = (py - 0.5) * -24;
    const rotateY = (px - 0.5) * 24;
    
    setRotation({ x: rotateX, y: rotateY });
    setGlare({
      x: px * 100,
      y: py * 100,
      opacity: 0.4
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Smoothly return card to original visual tilt (matches Landing hero perspective)
    setRotation({ x: 8, y: -16 });
    setGlare(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div 
      style={{
        perspective: '1200px',
        width: '100%',
        maxWidth: '430px',
        height: '270px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Card Body */}
      <div 
        ref={cardRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '20px',
          padding: '28px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#ffffff',
          overflow: 'hidden',
          boxShadow: isHovered 
            ? '0 35px 80px rgba(2, 132, 199, 0.15), 0 15px 45px rgba(0, 0, 0, 0.12)' 
            : '0 25px 60px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(2, 132, 199, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 40%, #0f172a 70%, #0284c7 100%)',
          transition: isHovered ? 'box-shadow 0.3s ease' : 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Meteor Shower Shooting Stars Overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
          <div className="meteor meteor1" />
          <div className="meteor meteor2" />
          <div className="meteor meteor3" />
          <div className="meteor meteor4" />
        </div>

        {/* Shiny metallic reflection glare layer */}
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`,
            pointerEvents: 'none',
            zIndex: 3,
            opacity: glare.opacity,
            transition: 'opacity 0.2s ease'
          }}
        />

        {/* Card Header (Aura Brand & contactless payment) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, transform: 'translateZ(30px)' }}>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 900, 
            letterSpacing: '-0.03em',
            background: 'linear-gradient(90deg, #ffffff 0%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: "'Playfair Display', serif"
          }}>
            AURA PLATINUM
          </div>
          <Wifi size={20} style={{ color: 'rgba(255, 255, 255, 0.6)', transform: 'rotate(90deg)' }} />
        </div>

        {/* Card Body (Golden Chip) */}
        <div style={{ display: 'flex', zIndex: 2, transform: 'translateZ(40px)' }}>
          {/* Metallic Chip */}
          <div style={{
            width: '45px',
            height: '35px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            borderRadius: '6px',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33%', width: '1px', backgroundColor: 'rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66%', width: '1px', backgroundColor: 'rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: 'rgba(0,0,0,0.15)' }} />
            <div style={{ position: 'absolute', left: '15%', right: '15%', top: '25%', bottom: '25%', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: 'transparent' }} />
          </div>
        </div>

        {/* Card Footer (Card number & Cardholder name) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2, transform: 'translateZ(30px)' }}>
          {/* Card Number */}
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 500, 
            letterSpacing: '0.18em', 
            fontFamily: "'Courier New', Courier, monospace",
            color: 'rgba(255, 255, 255, 0.95)'
          }}>
            4000 9582 7201 1060
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Card Holder</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', marginTop: '2px', color: '#ffffff' }}>AURA RISK PREMIUM</div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.85)', zIndex: 2 }} />
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.85)', marginLeft: '-10px', zIndex: 1 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Styled Meteor Shower animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .meteor {
          position: absolute;
          width: 80px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.7), transparent);
          opacity: 0;
          transform: rotate(-35deg);
        }
        
        .meteor1 {
          top: -20px;
          left: 50px;
          animation: meteorshow 4s linear infinite;
        }
        
        .meteor2 {
          top: 30px;
          left: 180px;
          background: linear-gradient(90deg, #38bdf8, transparent);
          animation: meteorshow 5s linear infinite 1.8s;
        }
        
        .meteor3 {
          top: -10px;
          left: 280px;
          background: linear-gradient(90deg, #a855f7, transparent);
          animation: meteorshow 6s linear infinite 3.2s;
        }

        .meteor4 {
          top: 80px;
          left: 120px;
          background: linear-gradient(90deg, #38bdf8, transparent);
          animation: meteorshow 4.5s linear infinite 0.8s;
        }
        
        @keyframes meteorshow {
          0% { transform: translate(-100px, -50px) rotate(-30deg); opacity: 0; }
          4% { opacity: 1; }
          16% { transform: translate(300px, 150px) rotate(-30deg); opacity: 0; }
          100% { transform: translate(300px, 150px) rotate(-30deg); opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default Meteor3DCard;
