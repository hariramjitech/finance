import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Float, PerspectiveCamera, Environment, MeshTransmissionMaterial, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';



function ParticleField({ count = 2000 }) {
    const ref = useRef();

    // Generate particles
    const { positions, colors, particles } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const c = new Float32Array(count * 3);
        const particles = [];
        const color = new THREE.Color();

        for (let i = 0; i < count; i++) {
            const x = THREE.MathUtils.randFloatSpread(50);
            const y = THREE.MathUtils.randFloatSpread(50);
            const z = THREE.MathUtils.randFloatSpread(50);
            p[i * 3] = x;
            p[i * 3 + 1] = y;
            p[i * 3 + 2] = z;

            // Crystal Blue Gradient (Blue to Cyan)
            // HSL: 0.55 (Cyan-Blue) to 0.65 (Royal Blue)
            color.setHSL(Math.random() * 0.1 + 0.55, 0.9, 0.6);
            c[i * 3] = color.r;
            c[i * 3 + 1] = color.g;
            c[i * 3 + 2] = color.b;

            particles.push({ x, y, z, speed: Math.random() * 0.02 });
        }
        return { positions: p, colors: c, particles };
    }, [count]);

    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.getElapsedTime();
            // Scroll interaction
            const scrollY = window.scrollY;
            const scrollSpeed = scrollY * 0.0002;

            // Rotate entire field based on scroll
            ref.current.rotation.y = t * 0.05 + scrollSpeed;
            ref.current.rotation.x = scrollY * 0.0001;

            // Pulse
            const positions = ref.current.geometry.attributes.position.array;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                // Subtle wave
                positions[i3] += Math.sin(t * 0.5 + particles[i].x) * 0.005;
                positions[i3 + 1] += Math.cos(t * 0.5 + particles[i].y) * 0.005;
            }
            ref.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <Points ref={ref} positions={positions} colors={colors} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                vertexColors
                size={0.06}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.6}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

const HyperObject = ({ position, scale, speed }) => {
    const mesh = useRef();
    const [hovered, setHover] = useState(false);

    // Physics / Smoothing refs
    const targetRotationX = useRef(0);
    const targetRotationY = useRef(0);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const t = state.clock.getElapsedTime();
        const scrollY = window.scrollY;

        // Calculate Target Rotation
        // Base rotation (time) + Scroll Interaction
        targetRotationX.current = Math.sin(t * speed * 0.2) + (scrollY * 0.001);
        targetRotationY.current = (t * speed * 0.3) + (scrollY * 0.002); // More reactive to scroll Y

        // Smooth Dampening (The "Weighted" feel)
        // Lerp current rotation to target rotation
        // damping factor: 4 * delta (adjust 4 for stiffness)
        mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, targetRotationX.current, 2, delta);
        mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, targetRotationY.current, 2, delta);

        // Breathing scale
        const breath = 1 + Math.sin(t * 1.5) * 0.03;
        mesh.current.scale.setScalar(scale * breath);
    });

    // Crystal Glass Material - "The Premium One"
    const materialProps = {
        backside: true,
        samples: 8,
        resolution: 512,
        thickness: 0.5,
        chromaticAberration: 0.3, // Increased for crystal look
        anisotropy: 0.1,
        distortion: 0.1,
        distortionScale: 0.1,
        temporalDistortion: 0.0,
        color: "#e0f2fe", // Pale Sky Blue (Crystal)
        background: new THREE.Color("#020617")
    };

    return (
        <Float speed={speed} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
            <mesh
                ref={mesh}
                position={position}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                {/* 
                    Standard Knot is best for showing off refraction
                */}
                <torusKnotGeometry args={[1, 0.3, 128, 32]} />
                <MeshTransmissionMaterial
                    {...materialProps}
                    chromaticAberration={0.3 + (hovered ? 0.2 : 0)}
                />
            </mesh>
        </Float>
    );
};

// Camera rig that moves slightly with functionality
const CameraRig = () => {
    useFrame((state) => {
        const scrollY = window.scrollY;
        // Move camera deeper as we scroll
        // state.camera.position.z = 15 - (scrollY * 0.005);
        // Tilt camera slightly
        state.camera.rotation.x = -scrollY * 0.0001;
    });
    return null;
};

// A light that follows the mouse
const HuntingLight = () => {
    const light = useRef();
    useFrame((state) => {
        if (light.current) {
            const { x, y } = state.mouse;
            light.current.position.x = -x * 10;
            light.current.position.y = -y * 10;
        }
    });
    return <spotLight ref={light} position={[0, 0, 10]} intensity={10} angle={0.5} penumbra={1} color="#3b82f6" />;
};

const SceneContent = () => {
    return (
        <>
            <CameraRig />
            <ParticleField count={800} />
            <HuntingLight />

            {/* The Main 3D Model */}
            <HyperObject position={[0, 0, -2]} scale={2.5} speed={0.5} />

            {/* Lighting - Balanced for Crystal Blue */}
            <Environment resolution={512}>
                <group rotation={[-Math.PI / 4, -0.3, 0]}>
                    <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
                    <Lightformer intensity={4} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 2, 1]} color="#3b82f6" />
                    <Lightformer intensity={4} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[20, 2, 1]} color="#06b6d4" />
                    <Lightformer intensity={4} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} color="#eff6ff" />
                </group>
            </Environment>

            <ambientLight intensity={0.5} />

            {/* Post Processing - Subtle Bloom */}
            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.0} radius={0.4} />
            </EffectComposer>
        </>
    );
};

export default function LandingScene() {
    return (
        <div className="fixed inset-0 z-0 select-none pointer-events-none">
            <Canvas
                dpr={[1, 1.5]} // Limit DPR for performance with PostProcessing
                gl={{
                    antialias: false, // PostProcessing handles AA usually, or disable for perf
                    alpha: true,
                    powerPreference: "high-performance",
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.5
                }}
                camera={{ position: [0, 0, 15], fov: 35 }}
            >
                <SceneContent />
                {/* Removed fog to let bloom pop more, or keep it subtle */}
                <fog attach="fog" args={['#020617', 5, 40]} />
            </Canvas>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none" />
        </div>
    );
}
