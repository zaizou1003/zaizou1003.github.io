import React, { useState, useEffect, useRef,Suspense  } from "react";
import { Canvas,  useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, useGLTF  } from "@react-three/drei";
import { Container, InfoPanel, InfoTitle, InfoText, CloseButton, TopLabel  } from "./style";
import data from '../../utils/data';
import BackButtonComponent from "./back"; 


// 🧠 Load the 3D Brain Model
const BrainModel = React.forwardRef(({ onLoaded }, ref) => {
  const { scene } = useGLTF("/models/brain.glb");
  const localRef  = useRef();
  const { camera } = useThree();
  const hasLoaded = useRef(false);


  useEffect(() => {
    if (scene && !hasLoaded.current) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      scene.position.sub(center);

      const maxSize = Math.max(size.x, size.y, size.z);
      camera.position.set(0, 0, maxSize * 0.8);
      camera.lookAt(0, 0, 0);
      hasLoaded.current = true;
      if (onLoaded) {
        onLoaded(scene);
      }
    }
  }, [scene, camera,onLoaded]);

  useEffect(() => {
    if (ref) {ref.current = localRef.current;}
  }, [scene, ref]);

  return <primitive ref={localRef} object={scene} />;
});

// 🔴 Clickable 3D Points
const ClickablePoint = ({ position, label, onClick, onHover  }) => {
  const [hovered, setHovered] = useState(false);

  if (!position || position.length !== 3) return null; // Prevent undefined errors

  return (
    <group>
      <mesh
        position={position}
        onPointerOver={(e) => {e.stopPropagation();setHovered(true);if (onHover) onHover(label);
        }}
        onPointerOut={(e) => {e.stopPropagation();setHovered(false);if (onHover) onHover(null);
        }}
        onClick={(e) => {e.stopPropagation();onClick();
        }}
      >
        <sphereGeometry args={[0.01, 32, 32]} />
        <meshPhongMaterial 
          color={hovered ? "#ff00ff" : "#00ffff"} // Magenta on hover, Cyan by default
          emissive={hovered ? "#b400b4" : "#008080"} // Soft glow effect
          emissiveIntensity={hovered ? 1.5  : 0.8} // More glow on hover
          metalness={0.8} // Makes it more metallic
          roughness={0.1}
          transparent
          opacity={0.9} />

      </mesh>
    </group>
  );
};

const FuturisticMindComponent = () => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const brainRef = useRef();
  const [topics, setTopics] = useState(data.topicsData);

  // 🔄 Compute topic positions once the model is loaded
  const handleModelLoaded = (scene) => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    setTopics((prevTopics) => {
      const updatedTopics = {};
      Object.keys(prevTopics).forEach((topic) => {
        updatedTopics[topic] = {
          ...prevTopics[topic],
          position: [
            center.x + (Math.random() - 0.5) * size.x * 0.5,
            center.y + (Math.random() - 0.5) * size.y * 0.5,
            center.z + (Math.random() - 0.5) * size.z * 0.5
          ],
        };
      });
      return updatedTopics;
        
    });
  };

  return (
    <Container>
      <BackButtonComponent />
      {hoveredLabel && <TopLabel>{hoveredLabel}</TopLabel>}
      <Canvas camera={{ position: [0, 0, 8] }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 2, 2]} />
          <BrainModel ref={brainRef} onLoaded={handleModelLoaded} />
          <OrbitControls enableZoom autoRotate autoRotateSpeed={0.5} />
          {/* Render only points with valid positions */}
          {Object.keys(topics).map((topic) =>
            topics[topic].position ? (
              <ClickablePoint
                key={topic}
                position={topics[topic].position}
                label={topic}
                onClick={() => setSelectedTopic(topic)}
                onHover={setHoveredLabel}
            />
          ) : null
        )}
      </Suspense>

    </Canvas>

      {/* Info Panel */}
      {selectedTopic && (
        <InfoPanel>
          <InfoTitle>{selectedTopic}</InfoTitle>
          <InfoText>{topics[selectedTopic].description}</InfoText>
          <CloseButton onClick={() => setSelectedTopic(null)}>Close</CloseButton>
        </InfoPanel>
      )}
    </Container>
  );
  };

  export default FuturisticMindComponent;

  
