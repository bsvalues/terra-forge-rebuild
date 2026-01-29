import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Float, Line, Sphere, Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import type { ParcelValuation, FeatureContribution, ValuationSegment } from "@/hooks/useValuationAnatomy";

const PHI = 1.618033988749895;
const TAU = Math.PI * 2;

interface ValuationCanvas3DProps {
  parcels: ParcelValuation[];
  segments: ValuationSegment[];
  viewMode: "parcels" | "segments" | "anatomy";
  selectedItem: ParcelValuation | ValuationSegment | null;
  onSelectItem: (item: ParcelValuation | ValuationSegment | null) => void;
}

function getFeatureColor(category: FeatureContribution["category"]): string {
  switch (category) {
    case "physical": return "#00D9D9";
    case "location": return "#D4AF37";
    case "market": return "#10B981";
    case "adjustment": return "#F59E0B";
    default: return "#6B7280";
  }
}

// Feature Stack - Stacked blocks representing value contributions
function FeatureStack({ 
  features, 
  position, 
  scale = 1,
  isSelected,
  onSelect,
}: { 
  features: FeatureContribution[];
  position: [number, number, number];
  scale?: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate stack heights based on contribution percentages
  const totalHeight = 3 * scale;
  let currentHeight = 0;

  useFrame((state) => {
    if (groupRef.current && (isSelected || hovered)) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
        {features.slice(0, 6).map((feature, index) => {
          const heightRatio = feature.percentage / 100;
          const blockHeight = Math.max(0.1, heightRatio * totalHeight);
          const y = currentHeight + blockHeight / 2;
          currentHeight += blockHeight + 0.02;

          return (
            <mesh
              key={feature.id}
              position={[0, y, 0]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect();
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = "auto";
              }}
            >
              <boxGeometry args={[0.8 * scale, blockHeight, 0.8 * scale]} />
              <meshPhysicalMaterial
                color={feature.color}
                transparent
                opacity={isSelected ? 0.9 : hovered ? 0.75 : 0.6}
                roughness={0.1}
                metalness={0.2}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </mesh>
          );
        })}

        {/* Value label on top */}
        {(hovered || isSelected) && (
          <Text
            position={[0, currentHeight + 0.3, 0]}
            fontSize={0.15 * scale}
            color="white"
            anchorX="center"
            anchorY="bottom"
          >
            {features[0]?.label || "Value"}
          </Text>
        )}
      </Float>

      {/* Glow base */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.6 * scale, 0.6 * scale, 0.1, 32]} />
        <meshBasicMaterial
          color={isSelected ? "#00D9D9" : "#1a2744"}
          transparent
          opacity={isSelected ? 0.5 : 0.3}
        />
      </mesh>
    </group>
  );
}

// Parcel Node - Simplified sphere for parcel view
function ParcelNode({
  parcel,
  position,
  isSelected,
  onSelect,
}: {
  parcel: ParcelValuation;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Size based on assessed value (logarithmic scale)
  const size = 0.2 + Math.log10(Math.max(parcel.assessedValue, 100000)) * 0.05;
  
  // Color based on ratio deviation from 1.0
  const ratioDeviation = Math.abs(parcel.ratio - 1.0);
  const color = ratioDeviation < 0.03 ? "#10B981" : 
                ratioDeviation < 0.07 ? "#F59E0B" : 
                "#EF4444";

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05;
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
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : hovered ? 0.8 : 0.6}
            roughness={0.1}
            metalness={0.3}
            clearcoat={1}
          />
        </mesh>

        {/* Outer glow */}
        <mesh scale={1.2}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.3 : 0.1}
            side={THREE.BackSide}
          />
        </mesh>

        {(hovered || isSelected) && (
          <Text
            position={[0, size + 0.2, 0]}
            fontSize={0.1}
            color="white"
            anchorX="center"
          >
            {parcel.parcelNumber}
          </Text>
        )}
      </Float>
    </group>
  );
}

// Segment Cluster - Group of parcels
function SegmentCluster({
  segment,
  position,
  isSelected,
  onSelect,
}: {
  segment: ValuationSegment;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <FeatureStack
      features={segment.features}
      position={position}
      scale={0.8 + segment.count * 0.01}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
}

// Anatomy View - Exploded view of single parcel
function AnatomyView({
  item,
  onSelect,
}: {
  item: ParcelValuation | ValuationSegment;
  onSelect: () => void;
}) {
  const features = "features" in item ? item.features : [];
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial
          color="#00D9D9"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Feature orbits */}
      {features.map((feature, index) => {
        const angle = (index / features.length) * TAU;
        const radius = 1.5 + index * 0.3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (feature.percentage / 100) * 2;
        const size = 0.2 + (feature.percentage / 100) * 0.5;

        return (
          <group key={feature.id}>
            {/* Feature sphere */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
              <mesh position={[x, y, z]}>
                <sphereGeometry args={[size, 24, 24]} />
                <meshPhysicalMaterial
                  color={feature.color}
                  transparent
                  opacity={0.8}
                  roughness={0.1}
                  metalness={0.3}
                  clearcoat={1}
                />
              </mesh>

              <Text
                position={[x, y + size + 0.2, z]}
                fontSize={0.12}
                color="white"
                anchorX="center"
              >
                {feature.label}
              </Text>

              <Text
                position={[x, y - size - 0.15, z]}
                fontSize={0.1}
                color="#9CA3AF"
                anchorX="center"
              >
                {feature.percentage.toFixed(1)}%
              </Text>
            </Float>

            {/* Connection line to center */}
            <Line
              points={[[0, 0, 0], [x, y, z]]}
              color={feature.color}
              lineWidth={1}
              transparent
              opacity={0.4}
            />
          </group>
        );
      })}
    </group>
  );
}

function Scene({ 
  parcels, 
  segments, 
  viewMode, 
  selectedItem, 
  onSelectItem 
}: ValuationCanvas3DProps) {
  // Generate positions using Phi spiral
  const parcelPositions = useMemo(() => {
    return parcels.slice(0, 50).map((parcel, index) => {
      const goldenAngle = TAU / (PHI * PHI);
      const angle = index * goldenAngle;
      const r = 1 + Math.sqrt(index) * 0.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 0;
      return { parcel, position: [x, y, z] as [number, number, number] };
    });
  }, [parcels]);

  const segmentPositions = useMemo(() => {
    return segments.slice(0, 20).map((segment, index) => {
      const goldenAngle = TAU / (PHI * PHI);
      const angle = index * goldenAngle;
      const r = 2 + index * 0.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 0;
      return { segment, position: [x, y, z] as [number, number, number] };
    });
  }, [segments]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00D9D9" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#D4AF37" />
      <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={0.8} />

      {/* Grid */}
      <gridHelper args={[30, 30, "#1a2744", "#0d1526"]} position={[0, -0.5, 0]} />

      {/* Render based on view mode */}
      {viewMode === "parcels" && parcelPositions.map(({ parcel, position }) => (
        <ParcelNode
          key={parcel.id}
          parcel={parcel}
          position={position}
          isSelected={selectedItem?.id === parcel.id}
          onSelect={() => onSelectItem(parcel)}
        />
      ))}

      {viewMode === "segments" && segmentPositions.map(({ segment, position }) => (
        <SegmentCluster
          key={segment.id}
          segment={segment}
          position={position}
          isSelected={selectedItem?.id === segment.id}
          onSelect={() => onSelectItem(segment)}
        />
      ))}

      {viewMode === "anatomy" && selectedItem && (
        <AnatomyView 
          item={selectedItem as ParcelValuation}
          onSelect={() => onSelectItem(null)}
        />
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        autoRotate={viewMode !== "anatomy"}
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function ValuationCanvas3D(props: ValuationCanvas3DProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-tf-substrate to-tf-deep relative">
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene {...props} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 text-xs">
        {props.viewMode === "parcels" && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-tf-optimized-green/70" />
              <span className="text-muted-foreground">Ratio ±3%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-tf-caution-amber/70" />
              <span className="text-muted-foreground">Ratio ±7%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-tf-alert-red/70" />
              <span className="text-muted-foreground">Ratio &gt;7%</span>
            </div>
          </>
        )}
        {(props.viewMode === "segments" || props.viewMode === "anatomy") && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-tf-cyan/70" />
              <span className="text-muted-foreground">Physical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-tf-sacred-gold/70" />
              <span className="text-muted-foreground">Location</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-tf-optimized-green/70" />
              <span className="text-muted-foreground">Market</span>
            </div>
          </>
        )}
      </div>

      {/* View mode indicator */}
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-tf-elevated/80 rounded-lg text-xs text-muted-foreground backdrop-blur-sm">
        {props.viewMode === "parcels" && "Parcel Distribution View"}
        {props.viewMode === "segments" && "Segment Stack View"}
        {props.viewMode === "anatomy" && "Feature Anatomy View"}
      </div>
    </div>
  );
}
