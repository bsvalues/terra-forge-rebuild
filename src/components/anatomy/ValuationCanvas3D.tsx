import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Float, Line, Sphere, Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import type { ParcelValuation, FeatureContribution, ValuationSegment } from "@/hooks/useValuationAnatomy";
import { TF3D, TF3D_FEATURE_CATEGORIES, ratioDeviationColor } from "@/lib/colors/tf3dPalette";

const PHI = 1.618033988749895;
const TAU = Math.PI * 2;

interface ValuationCanvas3DProps {
  parcels: ParcelValuation[];
  segments: ValuationSegment[];
  viewMode: "parcels" | "segments" | "anatomy" | "geographic";
  selectedItem: ParcelValuation | ValuationSegment | null;
  onSelectItem: (item: ParcelValuation | ValuationSegment | null) => void;
}

// Geographic terrain grid with elevation
function GeographicTerrain({ bounds }: { bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 20, 40, 40);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.2;
      positions.setZ(i, noise);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhysicalMaterial
          color={TF3D.deep}
          transparent
          opacity={0.8}
          roughness={0.9}
          metalness={0.1}
          wireframe={false}
        />
      </mesh>
      
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[20, 20, 20, 20]} />
        <meshBasicMaterial
          color={TF3D.cyan}
          transparent
          opacity={0.1}
          wireframe={true}
        />
      </mesh>

      {bounds && (
        <>
          <Text position={[-10, -10.5, 0.1]} fontSize={0.3} color={TF3D.muted} anchorX="left" rotation={[0, 0, 0]}>
            {bounds.minLng.toFixed(3)}°
          </Text>
          <Text position={[10, -10.5, 0.1]} fontSize={0.3} color={TF3D.muted} anchorX="right" rotation={[0, 0, 0]}>
            {bounds.maxLng.toFixed(3)}°
          </Text>
          <Text position={[-10.5, -10, 0.1]} fontSize={0.3} color={TF3D.muted} anchorX="right" rotation={[0, 0, Math.PI / 2]}>
            {bounds.minLat.toFixed(3)}°
          </Text>
          <Text position={[-10.5, 10, 0.1]} fontSize={0.3} color={TF3D.muted} anchorX="left" rotation={[0, 0, Math.PI / 2]}>
            {bounds.maxLat.toFixed(3)}°
          </Text>
        </>
      )}
    </group>
  );
}

// Neighborhood boundary indicator
function NeighborhoodMarker({ 
  code, 
  position, 
  parcelCount,
  avgRatio,
}: { 
  code: string; 
  position: [number, number, number];
  parcelCount: number;
  avgRatio: number;
}) {
  const [hovered, setHovered] = useState(false);
  const deviation = Math.abs(avgRatio - 1.0);
  const color = ratioDeviationColor(deviation);
  const size = 0.3 + Math.min(parcelCount / 20, 1) * 0.4;

  return (
    <group position={position}>
      <mesh
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[size * 2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.4 : 0.2}
        />
      </mesh>

      {hovered && (
        <Text position={[0, 0.5, 0]} fontSize={0.2} color={TF3D.white} anchorX="center">
          {code}
        </Text>
      )}
    </group>
  );
}

// Geographic Parcel Node
function GeoParcelNode({
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

  const size = 0.08 + Math.log10(Math.max(parcel.assessedValue, 100000)) * 0.02;
  const ratioDeviation = Math.abs(parcel.ratio - 1.0);
  const color = ratioDeviationColor(ratioDeviation);
  const height = Math.log10(Math.max(parcel.assessedValue, 100000)) * 0.15;

  useFrame((state) => {
    if (meshRef.current && (isSelected || hovered)) {
      meshRef.current.scale.setScalar(1.2);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <boxGeometry args={[size, height, size]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.95 : hovered ? 0.85 : 0.7}
          roughness={0.2}
          metalness={0.3}
          clearcoat={1}
        />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.8, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {(isSelected || hovered) && (
        <>
          <pointLight position={[0, height, 0]} color={color} intensity={0.5} distance={2} />
          <Text position={[0, height + 0.3, 0]} fontSize={0.12} color={TF3D.white} anchorX="center">
            {parcel.parcelNumber}
          </Text>
          <Text position={[0, height + 0.15, 0]} fontSize={0.08} color={TF3D.mutedLight} anchorX="center">
            ${(parcel.assessedValue / 1000).toFixed(0)}K
          </Text>
        </>
      )}
    </group>
  );
}

function getFeatureColor(category: FeatureContribution["category"]): string {
  return TF3D_FEATURE_CATEGORIES[category as keyof typeof TF3D_FEATURE_CATEGORIES] ?? TF3D_FEATURE_CATEGORIES.default;
}

// Feature Stack
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
              onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
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

        {(hovered || isSelected) && (
          <Text
            position={[0, currentHeight + 0.3, 0]}
            fontSize={0.15 * scale}
            color={TF3D.white}
            anchorX="center"
            anchorY="bottom"
          >
            {features[0]?.label || "Value"}
          </Text>
        )}
      </Float>

      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.6 * scale, 0.6 * scale, 0.1, 32]} />
        <meshBasicMaterial
          color={isSelected ? TF3D.cyan : TF3D.elevated}
          transparent
          opacity={isSelected ? 0.5 : 0.3}
        />
      </mesh>
    </group>
  );
}

// Parcel Node
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

  const size = 0.2 + Math.log10(Math.max(parcel.assessedValue, 100000)) * 0.05;
  const ratioDeviation = Math.abs(parcel.ratio - 1.0);
  const color = ratioDeviationColor(ratioDeviation);

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
          onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
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
          <Text position={[0, size + 0.2, 0]} fontSize={0.1} color={TF3D.white} anchorX="center">
            {parcel.parcelNumber}
          </Text>
        )}
      </Float>
    </group>
  );
}

// Segment Cluster
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

// Anatomy View
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
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial
          color={TF3D.cyan}
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {features.map((feature, index) => {
        const angle = (index / features.length) * TAU;
        const radius = 1.5 + index * 0.3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (feature.percentage / 100) * 2;
        const featureSize = 0.2 + (feature.percentage / 100) * 0.5;

        return (
          <group key={feature.id}>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
              <mesh position={[x, y, z]}>
                <sphereGeometry args={[featureSize, 24, 24]} />
                <meshPhysicalMaterial
                  color={feature.color}
                  transparent
                  opacity={0.8}
                  roughness={0.1}
                  metalness={0.3}
                  clearcoat={1}
                />
              </mesh>

              <Text position={[x, y + featureSize + 0.2, z]} fontSize={0.12} color={TF3D.white} anchorX="center">
                {feature.label}
              </Text>

              <Text position={[x, y - featureSize - 0.15, z]} fontSize={0.1} color={TF3D.mutedLight} anchorX="center">
                {feature.percentage.toFixed(1)}%
              </Text>
            </Float>

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

  const { geoPositions, geoBounds } = useMemo(() => {
    const parcelsWithCoords = parcels.filter(p => 
      p.latitude !== null && p.longitude !== null && 
      !isNaN(p.latitude) && !isNaN(p.longitude)
    );
    
    if (parcelsWithCoords.length === 0) {
      const fallbackPositions = parcels.slice(0, 150).map((parcel, index) => {
        const nbhdHash = (parcel.neighborhood || "X").split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const baseX = ((nbhdHash % 10) - 5) * 1.5;
        const baseZ = ((Math.floor(nbhdHash / 10) % 10) - 5) * 1.5;
        const idHash = parcel.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const jitterX = ((idHash % 100) / 100 - 0.5) * 2;
        const jitterZ = (((idHash * 7) % 100) / 100 - 0.5) * 2;
        
        return {
          parcel,
          position: [baseX + jitterX, 0, baseZ + jitterZ] as [number, number, number],
        };
      });

      return { geoPositions: fallbackPositions, geoBounds: null };
    }

    const lats = parcelsWithCoords.map(p => p.latitude!);
    const lngs = parcelsWithCoords.map(p => p.longitude!);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    const positions = parcelsWithCoords.slice(0, 200).map((parcel) => {
      const x = ((parcel.longitude! - minLng) / lngRange) * 18 - 9;
      const z = -((parcel.latitude! - minLat) / latRange) * 18 + 9;
      
      return {
        parcel,
        position: [x, 0, z] as [number, number, number],
      };
    });

    return {
      geoPositions: positions,
      geoBounds: { minLat, maxLat, minLng, maxLng },
    };
  }, [parcels]);

  const neighborhoodGroups = useMemo(() => {
    const groups: Record<string, { parcels: typeof geoPositions; avgRatio: number; center: [number, number, number] }> = {};
    
    geoPositions.forEach(({ parcel, position }) => {
      const nbhd = parcel.neighborhood || "Unknown";
      if (!groups[nbhd]) {
        groups[nbhd] = { parcels: [], avgRatio: 0, center: [0, 0, 0] };
      }
      groups[nbhd].parcels.push({ parcel, position });
    });

    Object.values(groups).forEach(group => {
      const sumX = group.parcels.reduce((a, p) => a + p.position[0], 0);
      const sumZ = group.parcels.reduce((a, p) => a + p.position[2], 0);
      const sumRatio = group.parcels.reduce((a, p) => a + p.parcel.ratio, 0);
      
      group.center = [sumX / group.parcels.length, 0, sumZ / group.parcels.length];
      group.avgRatio = sumRatio / group.parcels.length;
    });

    return groups;
  }, [geoPositions]);

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
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color={TF3D.lightPrimary} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={TF3D.lightAccent} />
      <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={0.8} />

      {viewMode === "geographic" ? (
        <GeographicTerrain bounds={geoBounds} />
      ) : (
        <gridHelper args={[30, 30, TF3D.elevated, TF3D.deep]} position={[0, -0.5, 0]} />
      )}

      {viewMode === "parcels" && parcelPositions.map(({ parcel, position }) => (
        <ParcelNode
          key={parcel.id}
          parcel={parcel}
          position={position}
          isSelected={selectedItem?.id === parcel.id}
          onSelect={() => onSelectItem(parcel)}
        />
      ))}

      {viewMode === "geographic" && (
        <>
          {Object.entries(neighborhoodGroups).map(([code, group]) => (
            <NeighborhoodMarker
              key={code}
              code={code}
              position={group.center}
              parcelCount={group.parcels.length}
              avgRatio={group.avgRatio}
            />
          ))}
          
          {geoPositions.map(({ parcel, position }) => (
            <GeoParcelNode
              key={parcel.id}
              parcel={parcel}
              position={position}
              isSelected={selectedItem?.id === parcel.id}
              onSelect={() => onSelectItem(parcel)}
            />
          ))}
        </>
      )}

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

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={25}
        autoRotate={viewMode !== "anatomy" && viewMode !== "geographic"}
        autoRotateSpeed={0.3}
        maxPolarAngle={viewMode === "geographic" ? Math.PI / 2.5 : Math.PI}
      />
    </>
  );
}

export function ValuationCanvas3D(props: ValuationCanvas3DProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-tf-substrate to-tf-deep relative">
      <Canvas
        camera={{ 
          position: props.viewMode === "geographic" ? [0, 12, 12] : [8, 6, 8], 
          fov: 50 
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene {...props} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 text-xs">
        {(props.viewMode === "parcels" || props.viewMode === "geographic") && (
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
        {props.viewMode === "geographic" && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-tf-border">
            <span className="text-muted-foreground">Height = Value</span>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 px-3 py-1.5 bg-tf-elevated/80 rounded-lg text-xs text-muted-foreground backdrop-blur-sm">
        {props.viewMode === "parcels" && "Parcel Distribution View"}
        {props.viewMode === "segments" && "Segment Stack View"}
        {props.viewMode === "anatomy" && "Feature Anatomy View"}
        {props.viewMode === "geographic" && "Geographic GIS View"}
      </div>

      {props.viewMode === "geographic" && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-tf-elevated/80 rounded-lg text-xs backdrop-blur-sm">
          <span className="text-tf-cyan">{props.parcels.length}</span>
          <span className="text-muted-foreground"> parcels mapped</span>
        </div>
      )}
    </div>
  );
}
