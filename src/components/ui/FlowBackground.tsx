// Watery flowing blob background — matches the glassmorphic light UI
// Pure CSS animations, GPU-composited (transform + filter only)

export default function FlowBackground() {
  return (
    <>
      <style>{`
        @keyframes flow-blob-1 {
          0%, 100% {
            border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%;
            transform: translate(0px, 0px) scale(1);
          }
          20% {
            border-radius: 38% 62% 54% 46% / 44% 60% 40% 56%;
            transform: translate(18px, -28px) scale(1.04);
          }
          40% {
            border-radius: 54% 46% 38% 62% / 56% 36% 64% 44%;
            transform: translate(-12px, 22px) scale(0.97);
          }
          60% {
            border-radius: 46% 54% 62% 38% / 40% 64% 36% 60%;
            transform: translate(28px, 10px) scale(1.06);
          }
          80% {
            border-radius: 70% 30% 44% 56% / 52% 48% 52% 48%;
            transform: translate(-8px, -18px) scale(0.95);
          }
        }

        @keyframes flow-blob-2 {
          0%, 100% {
            border-radius: 44% 56% 60% 40% / 50% 58% 42% 50%;
            transform: translate(0px, 0px) scale(1);
          }
          25% {
            border-radius: 60% 40% 44% 56% / 42% 50% 58% 50%;
            transform: translate(-22px, 18px) scale(1.07);
          }
          50% {
            border-radius: 36% 64% 54% 46% / 60% 36% 64% 40%;
            transform: translate(20px, -22px) scale(0.94);
          }
          75% {
            border-radius: 56% 44% 40% 60% / 38% 62% 44% 56%;
            transform: translate(-28px, -8px) scale(1.03);
          }
        }

        @keyframes flow-blob-3 {
          0%, 100% {
            border-radius: 50% 50% 40% 60% / 60% 40% 60% 40%;
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            border-radius: 40% 60% 60% 40% / 40% 60% 40% 60%;
            transform: translate(24px, 24px) scale(1.08);
          }
          66% {
            border-radius: 60% 40% 44% 56% / 56% 44% 56% 44%;
            transform: translate(-16px, -20px) scale(0.92);
          }
        }

        @keyframes flow-blob-4 {
          0%, 100% {
            border-radius: 66% 34% 44% 56% / 42% 58% 42% 58%;
            transform: translate(0px, 0px) scale(1);
          }
          40% {
            border-radius: 34% 66% 56% 44% / 58% 42% 58% 42%;
            transform: translate(30px, -14px) scale(1.05);
          }
          70% {
            border-radius: 50% 50% 66% 34% / 34% 66% 50% 50%;
            transform: translate(-20px, 26px) scale(0.96);
          }
        }

        .flow-blob {
          position: fixed;
          pointer-events: none;
          will-change: transform, border-radius;
          z-index: 0;
        }
      `}</style>

      {/* Blob 1 — large green, top-center */}
      <div
        className="flow-blob"
        style={{
          width: 640,
          height: 560,
          top: -160,
          left: "18%",
          background: "radial-gradient(ellipse at 45% 45%, rgba(13,43,26,0.13) 0%, rgba(14,65,32,0.07) 45%, transparent 70%)",
          filter: "blur(90px)",
          animation: "flow-blob-1 32s ease-in-out infinite",
        }}
      />

      {/* Blob 2 — gold, bottom-right */}
      <div
        className="flow-blob"
        style={{
          width: 480,
          height: 440,
          bottom: -100,
          right: "8%",
          background: "radial-gradient(ellipse at 55% 55%, rgba(201,168,76,0.13) 0%, rgba(245,158,11,0.06) 45%, transparent 70%)",
          filter: "blur(80px)",
          animation: "flow-blob-2 38s ease-in-out infinite",
        }}
      />

      {/* Blob 3 — teal-green, left-middle */}
      <div
        className="flow-blob"
        style={{
          width: 360,
          height: 340,
          top: "35%",
          left: "-60px",
          background: "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.09) 0%, rgba(13,100,60,0.04) 50%, transparent 70%)",
          filter: "blur(70px)",
          animation: "flow-blob-3 26s ease-in-out infinite",
        }}
      />

      {/* Blob 4 — soft green, top-right accent */}
      <div
        className="flow-blob"
        style={{
          width: 300,
          height: 280,
          top: "10%",
          right: "12%",
          background: "radial-gradient(ellipse at 50% 40%, rgba(13,43,26,0.08) 0%, rgba(21,128,61,0.04) 50%, transparent 70%)",
          filter: "blur(60px)",
          animation: "flow-blob-4 22s ease-in-out infinite",
        }}
      />
    </>
  )
}
