import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SystemState } from "./types";
import { cn } from "@/lib/utils";
import { TF3D, TF3D_STATES } from "@/lib/colors/tf3dPalette";

interface TerraSphereVisualProps {
  size?: "sm" | "md" | "lg";
  state?: SystemState;
  className?: string;
}

const SIZE_MAP = {
  sm: { container: "w-8 h-8", scale: 0.4 },
  md: { container: "w-16 h-16", scale: 0.7 },
  lg: { container: "w-32 h-32", scale: 1.2 },
};

// Inner sphere component with shader
function CoreSphere({ state }: { state: SystemState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = TF3D_STATES[state];

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(colors.primary) },
        uPulse: { value: 1 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vNormal = normal;
          vUv = uv;
          
          vec3 pos = position;
          float displacement = sin(uTime * 2.0 + position.y * 8.0) * 0.02 * uPulse;
          pos += normal * displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 color = uColor * (0.5 + fresnel * 0.5);
          
          float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
          float glow = fresnel * pulse * uPulse;
          
          color += vec3(0.2, 0.8, 1.0) * glow;
          
          float alpha = 0.7 + fresnel * 0.3;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = new THREE.Color(colors.primary);
    }
  }, [colors.primary]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      
      let targetPulse = 1;
      if (state === "processing") targetPulse = 1.5;
      if (state === "alert") targetPulse = 1.8;
      if (state === "success") targetPulse = 1.3;
      
      materialRef.current.uniforms.uPulse.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uPulse.value,
        targetPulse,
        0.1
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.5, 3]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Wireframe lattice rings
function LatticeRings({ state }: { state: SystemState }) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = TF3D_STATES[state];

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.rotation.z += delta * 0.05;
    }
  });

  const ringPositions = [
    { rotation: [0, 0, 0] },
    { rotation: [Math.PI / 3, 0, 0] },
    { rotation: [Math.PI / 3 * 2, 0, 0] },
    { rotation: [0, Math.PI / 3, 0] },
    { rotation: [0, Math.PI / 3 * 2, 0] },
  ];

  return (
    <group ref={groupRef}>
      {ringPositions.map((pos, i) => (
        <mesh key={i} rotation={pos.rotation as [number, number, number]}>
          <torusGeometry args={[0.8, 0.008, 2, 64]} />
          <meshBasicMaterial 
            color={colors.primary} 
            transparent 
            opacity={0.4} 
          />
        </mesh>
      ))}
    </group>
  );
}

// Orbiting particles
function OrbitingParticles({ state }: { state: SystemState }) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = TF3D_STATES[state];
  const particleCount = 12;

  useFrame((rootState) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rootState.clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: particleCount }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 0.9;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle * 2) * 0.2;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial 
              color={colors.secondary} 
              transparent 
              opacity={0.8} 
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Main scene
function TerraSphereScene({ state }: { state: SystemState }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color={TF3D.lightPrimary} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} color={TF3D.lightSecondary} />
      
      <CoreSphere state={state} />
      <LatticeRings state={state} />
      <OrbitingParticles state={state} />
    </>
  );
}

export function TerraSphereVisual({ 
  size = "md", 
  state = "idle",
  className 
}: TerraSphereVisualProps) {
  const sizeConfig = SIZE_MAP[size];

  return (
    <div 
      className={cn(
        "terrasphere-container",
        sizeConfig.container,
        className
      )}
      data-state={state}
    >
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <TerraSphereScene state={state} />
      </Canvas>
    </div>
  );
}
