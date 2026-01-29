import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, Line } from "@react-three/drei";
import * as THREE from "three";
import type { FileNode } from "./AxiomFSDashboard";

const PHI = 1.618033988749895;
const TAU = Math.PI * 2;

interface FileLatticeCanvasProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
  expandedFolders: Set<string>;
}

function getFileColor(type: FileNode["type"]): string {
  switch (type) {
    case "folder": return "#00D9D9";
    case "document": return "#10B981";
    case "image": return "#F59E0B";
    case "data": return "#8B5CF6";
    case "config": return "#D4AF37";
    default: return "#6B7280";
  }
}

interface GlassVoxelProps {
  file: FileNode;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

function GlassVoxel({ file, position, isSelected, onClick }: GlassVoxelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = useMemo(() => getFileColor(file.type), [file.type]);
  
  // Size based on file size (logarithmic scale)
  const baseSize = 0.3 + Math.log10(Math.max(file.size, 1000)) * 0.05;
  const size = file.type === "folder" ? baseSize * 1.2 : baseSize;

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05;
      
      // Rotation for selected/hovered
      if (isSelected || hovered) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          {file.type === "folder" ? (
            <boxGeometry args={[size * 1.2, size * 0.8, size * 0.6]} />
          ) : (
            <boxGeometry args={[size, size, size]} />
          )}
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.9 : hovered ? 0.75 : 0.5}
            roughness={0.1}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1}
          />
        </mesh>
        
        {/* Glow effect */}
        <mesh scale={[1.1, 1.1, 1.1]}>
          {file.type === "folder" ? (
            <boxGeometry args={[size * 1.2, size * 0.8, size * 0.6]} />
          ) : (
            <boxGeometry args={[size, size, size]} />
          )}
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Label */}
        {(hovered || isSelected) && (
          <Text
            position={[0, size * 0.8, 0]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="bottom"
            maxWidth={2}
          >
            {file.name}
          </Text>
        )}
      </Float>
    </group>
  );
}

interface PhiLatticeProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
}

function PhiLattice({ files, selectedFile, onSelectFile }: PhiLatticeProps) {
  // Generate Phi-governed spiral positions
  const filePositions = useMemo(() => {
    const positions: Array<{ file: FileNode; position: [number, number, number] }> = [];
    
    const placeFiles = (nodes: FileNode[], centerX: number, centerZ: number, radius: number, startAngle: number) => {
      nodes.forEach((file, index) => {
        // Golden angle for optimal distribution
        const goldenAngle = TAU / (PHI * PHI);
        const angle = startAngle + index * goldenAngle;
        
        // Phi-based radius spiral
        const r = radius * Math.pow(PHI, index * 0.1);
        const x = centerX + Math.cos(angle) * r;
        const z = centerZ + Math.sin(angle) * r;
        const y = (file.type === "folder" ? 0.5 : 0) + (index % 3) * 0.3;
        
        positions.push({ file, position: [x, y, z] });
        
        // Place children in sub-spiral
        if (file.children && file.children.length > 0) {
          placeFiles(file.children, x, z, radius * 0.4, angle);
        }
      });
    };
    
    placeFiles(files, 0, 0, 1.5, 0);
    return positions;
  }, [files]);

  return (
    <>
      {filePositions.map(({ file, position }) => (
        <GlassVoxel
          key={file.id}
          file={file}
          position={position}
          isSelected={selectedFile?.id === file.id}
          onClick={() => onSelectFile(file)}
        />
      ))}
      
      {/* Connection lines */}
      {filePositions.map(({ file, position }) => {
        if (!file.children) return null;
        return file.children.map((child) => {
          const childPos = filePositions.find((fp) => fp.file.id === child.id);
          if (!childPos) return null;
          
          return (
            <Line
              key={`${file.id}-${child.id}`}
              points={[position, childPos.position]}
              color="#00D9D9"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
          );
        });
      })}
    </>
  );
}

function Scene({ files, selectedFile, onSelectFile }: PhiLatticeProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00D9D9" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#D4AF37" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.5}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
      />
      
      {/* Grid */}
      <gridHelper args={[20, 20, "#1a2744", "#0d1526"]} position={[0, -0.5, 0]} />
      
      {/* Phi Lattice */}
      <PhiLattice files={files} selectedFile={selectedFile} onSelectFile={onSelectFile} />
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function FileLatticeCanvas({ files, selectedFile, onSelectFile }: FileLatticeCanvasProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-tf-substrate to-tf-deep">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene files={files} selectedFile={selectedFile} onSelectFile={onSelectFile} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-tf-transcend-cyan/70" />
          <span className="text-muted-foreground">Folder</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-tf-optimized-green/70" />
          <span className="text-muted-foreground">Document</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-tf-caution-amber/70" />
          <span className="text-muted-foreground">Image</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "#8B5CF6" }} />
          <span className="text-muted-foreground">Data</span>
        </div>
      </div>
    </div>
  );
}
