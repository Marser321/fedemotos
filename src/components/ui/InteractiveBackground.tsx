"use client";

import { useEffect, useRef } from "react";

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 150,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    // Particle Configuration
    const particles: Particle[] = [];
    const maxParticles = width < 768 ? 40 : 80;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      baseAlpha: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Velocidad lenta para que sea sutil
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 1;
        this.baseAlpha = Math.random() * 0.5 + 0.2;
        this.color = `rgba(172, 28, 29, ${this.baseAlpha})`; // Rojo Fede
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Rebotes en bordes
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Interacción con mouse (atracción sutil)
        if (mouse.x > 0 && mouse.y > 0) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 0.6;
            this.y -= (dy / dist) * force * 0.6;
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
      }
    };

    // Dibujar cuadrícula en perspectiva (look de escáner digital)
    const drawGrid = (c: CanvasRenderingContext2D) => {
      const gridSpacing = 60;
      const horizon = height * 0.25; // Punto de fuga

      c.strokeStyle = "rgba(172, 28, 29, 0.04)";
      c.lineWidth = 1;

      // Líneas horizontales en perspectiva
      for (let y = horizon; y < height; y += gridSpacing * 1.5) {
        // Cuanto más abajo, más espaciadas y visibles
        const factor = (y - horizon) / (height - horizon);
        c.strokeStyle = `rgba(172, 28, 29, ${factor * 0.08})`;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(width, y);
        c.stroke();
      }

      // Líneas verticales en perspectiva (hacia el punto de fuga superior central)
      const centerX = width / 2;
      const numLines = 24;
      c.strokeStyle = "rgba(172, 28, 29, 0.03)";
      for (let i = -numLines / 2; i <= numLines / 2; i++) {
        const factor = i / (numLines / 2);
        const startX = centerX + factor * (width * 0.15); // Fin en el horizonte
        const endX = centerX + factor * (width * 1.2);    // Inicio en la base

        c.beginPath();
        c.moveTo(startX, horizon);
        c.lineTo(endX, height);
        c.stroke();
      }
    };

    const drawConnections = (c: CanvasRenderingContext2D) => {
      const maxDistance = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.18;
            c.strokeStyle = `rgba(172, 28, 29, ${alpha})`;
            c.lineWidth = 0.8;
            c.beginPath();
            c.moveTo(p1.x, p1.y);
            c.lineTo(p2.x, p2.y);
            c.stroke();
          }
        }
      }
    };

    const animate = () => {
      // Fondo sutilmente oscuro
      ctx.fillStyle = "rgba(10, 10, 10, 0.95)";
      ctx.fillRect(0, 0, width, height);

      // Dibujar cuadrícula de escáner
      drawGrid(ctx);

      // Dibujar y actualizar partículas
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      // Dibujar conexiones entre partículas
      drawConnections(ctx);

      // Efecto interactivo del ratón
      if (mouse.x > 0 && mouse.y > 0) {
        const grad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius
        );
        grad.addColorStop(0, "rgba(172, 28, 29, 0.08)");
        grad.addColorStop(1, "rgba(172, 28, 29, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none block"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
