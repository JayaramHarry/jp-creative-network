import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ManualEraserModal.css';

/**
 * ManualEraserModal — Client-side background eraser tool.
 * Runs 100% in the browser. No server, no Python, no AI.
 *
 * Props:
 *   isOpen      — boolean controlling visibility
 *   imageUrl    — data URL or src of the image to edit
 *   onApply     — callback(transparentDataUrl) when user clicks Apply
 *   onCancel    — callback when user clicks Cancel
 */
export default function ManualEraserModal({ isOpen, imageUrl, onApply, onCancel }) {
  // --- Tool state ---
  const [tool, setTool] = useState('eraser');       // 'eraser' | 'restore'
  const [brushSize, setBrushSize] = useState(30);
  const [brushHardness, setBrushHardness] = useState(100); // 0–100
  const [edgeDetection, setEdgeDetection] = useState(false);
  const [colorTolerance, setColorTolerance] = useState(40);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // --- Refs ---
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);      // HTMLImageElement of original
  const originalDataRef = useRef(null);       // ImageData of original (for restore)
  const maskCanvasRef = useRef(null);         // offscreen mask canvas (alpha channel)
  const historyRef = useRef([]);              // undo stack of ImageData snapshots
  const redoStackRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);
  const cursorRef = useRef(null);
  const sampledColorRef = useRef(null);       // for edge detection
  const activePointersRef = useRef(new Map());
  const pinchBaseRef = useRef(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef(null);
  const spaceDownRef = useRef(false);

  // ============================================================
  //  Initialization — load image into canvases
  // ============================================================
  useEffect(() => {
    if (!isOpen) {
      // Clear memory references and history stack immediately when closed
      historyRef.current = [];
      redoStackRef.current = [];
      originalImageRef.current = null;
      originalDataRef.current = null;
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = 0;
        maskCanvasRef.current.height = 0;
      }
      maskCanvasRef.current = null;
      sampledColorRef.current = null;
      activePointersRef.current.clear();
      
      // Clear main canvas references
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
      return;
    }

    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;

      // Main canvas
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      originalDataRef.current = ctx.getImageData(0, 0, img.width, img.height);

      // Mask canvas — fully opaque to start
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fillRect(0, 0, img.width, img.height);
      maskCanvasRef.current = maskCanvas;

      // Reset state
      historyRef.current = [maskCtx.getImageData(0, 0, img.width, img.height)];
      redoStackRef.current = [];
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      sampledColorRef.current = null;

      // Fit to screen
      fitToScreen(img);
      renderComposite();
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageUrl]);

  // ============================================================
  //  Fit To Screen
  // ============================================================
  const fitToScreen = useCallback((img) => {
    const vp = viewportRef.current;
    if (!vp || !img) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const scale = Math.min(vw / img.width, vh / img.height, 1) * 0.9;
    setZoom(scale);
    setPanOffset({
      x: (vw - img.width * scale) / 2,
      y: (vh - img.height * scale) / 2
    });
  }, []);

  // ============================================================
  //  Composite render — draw original image masked by alpha
  // ============================================================
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const mask = maskCanvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !mask || !img) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply mask as alpha: where mask is black → transparent
    const imgData = ctx.getImageData(0, 0, w, h);
    const maskCtx = mask.getContext('2d');
    const maskData = maskCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    const mPixels = maskData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      // Use the red channel of the mask as alpha
      pixels[i + 3] = mPixels[i]; // mask R channel → image alpha
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  // ============================================================
  //  History (Undo / Redo)
  // ============================================================
  const pushHistory = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const maskCtx = mask.getContext('2d');
    const snapshot = maskCtx.getImageData(0, 0, mask.width, mask.height);
    historyRef.current.push(snapshot);
    redoStackRef.current = [];
    // Limit to 30 snapshots
    if (historyRef.current.length > 30) historyRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.length <= 1) return;
    const current = history.pop();
    redoStackRef.current.push(current);
    const prev = history[history.length - 1];
    const mask = maskCanvasRef.current;
    mask.getContext('2d').putImageData(prev, 0, 0);
    renderComposite();
  }, [renderComposite]);

  const redo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    historyRef.current.push(next);
    const mask = maskCanvasRef.current;
    mask.getContext('2d').putImageData(next, 0, 0);
    renderComposite();
  }, [renderComposite]);

  const resetMask = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const maskCtx = mask.getContext('2d');
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    pushHistory();
    renderComposite();
  }, [pushHistory, renderComposite]);

  // ============================================================
  //  Coordinate conversion: screen → image pixel
  // ============================================================
  const screenToImage = useCallback((clientX, clientY) => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };
    const rect = vp.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - panOffset.x) / zoom,
      y: (sy - panOffset.y) / zoom
    };
  }, [panOffset, zoom]);

  // ============================================================
  //  Brush painting on the mask canvas
  // ============================================================
  const paintAt = useCallback((imgX, imgY) => {
    const mask = maskCanvasRef.current;
    const img = originalImageRef.current;
    if (!mask || !img) return;

    const maskCtx = mask.getContext('2d');
    const radius = brushSize / 2;
    const hardness = brushHardness / 100;
    const isEraser = tool === 'eraser';

    if (edgeDetection && isEraser && sampledColorRef.current) {
      // --- Edge-aware erasing ---
      const orig = originalDataRef.current;
      const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);
      const mp = maskData.data;
      const op = orig.data;
      const tgt = sampledColorRef.current;
      const tol = colorTolerance;

      const x0 = Math.max(0, Math.floor(imgX - radius));
      const y0 = Math.max(0, Math.floor(imgY - radius));
      const x1 = Math.min(mask.width - 1, Math.ceil(imgX + radius));
      const y1 = Math.min(mask.height - 1, Math.ceil(imgY + radius));

      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const dx = px - imgX;
          const dy = py - imgY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          // Feather: closer to edge → less effect
          let strength = 1;
          if (hardness < 1) {
            const featherStart = radius * hardness;
            if (dist > featherStart) {
              strength = 1 - (dist - featherStart) / (radius - featherStart);
            }
          }

          const idx = (py * mask.width + px) * 4;
          // Color distance check
          const dr = op[idx] - tgt.r;
          const dg = op[idx + 1] - tgt.g;
          const db = op[idx + 2] - tgt.b;
          const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (colorDist <= tol) {
            // Erase: set mask to 0 (transparent)
            const newVal = Math.max(0, mp[idx] - Math.round(255 * strength));
            mp[idx] = mp[idx + 1] = mp[idx + 2] = newVal;
          }
        }
      }
      maskCtx.putImageData(maskData, 0, 0);
    } else {
      // --- Standard brush (erase or restore) ---
      maskCtx.save();
      maskCtx.beginPath();
      maskCtx.arc(imgX, imgY, radius, 0, Math.PI * 2);
      maskCtx.closePath();

      if (brushHardness < 100) {
        // Soft brush using radial gradient
        const gradient = maskCtx.createRadialGradient(imgX, imgY, radius * (hardness), imgX, imgY, radius);
        if (isEraser) {
          gradient.addColorStop(0, 'rgba(0,0,0,1)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          gradient.addColorStop(0, 'rgba(255,255,255,1)');
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
        }
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = gradient;
      } else {
        // Hard brush
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = isEraser ? '#000000' : '#ffffff';
      }

      maskCtx.fill();
      maskCtx.restore();
    }

    renderComposite();
  }, [tool, brushSize, brushHardness, edgeDetection, colorTolerance, renderComposite]);

  // Interpolate between two points for smooth strokes
  const paintLine = useCallback((from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, brushSize / 6);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      paintAt(from.x + dx * t, from.y + dy * t);
    }
  }, [paintAt, brushSize]);

  // ============================================================
  //  Pointer event handlers (unified mouse + touch)
  // ============================================================
  const handlePointerDown = useCallback((e) => {
    console.log('[PointerDown] pointerId:', e.pointerId, 'pointerType:', e.pointerType, 'clientX:', e.clientX, 'clientY:', e.clientY);
    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger → pan/pinch
    if (pointers.size === 2) {
      isDrawingRef.current = false;
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchBaseRef.current = { dist, zoom, panOffset: { ...panOffset } };
      return;
    }

    // Space key held → pan mode
    if (spaceDownRef.current) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
      return;
    }

    // Single finger/click → draw
    if (pointers.size === 1) {
      try {
        e.target.setPointerCapture(e.pointerId);
        console.log('[PointerCapture] set pointer capture success for ID:', e.pointerId);
      } catch (err) {
        console.warn('[PointerCapture] setPointerCapture failed:', err);
      }
      isDrawingRef.current = true;
      const imgPos = screenToImage(e.clientX, e.clientY);
      lastPosRef.current = imgPos;

      // Sample color for edge detection
      if (edgeDetection && tool === 'eraser') {
        const orig = originalDataRef.current;
        if (orig) {
          const px = Math.round(imgPos.x);
          const py = Math.round(imgPos.y);
          if (px >= 0 && px < orig.width && py >= 0 && py < orig.height) {
            const idx = (py * orig.width + px) * 4;
            sampledColorRef.current = {
              r: orig.data[idx],
              g: orig.data[idx + 1],
              b: orig.data[idx + 2]
            };
          }
        }
      }

      paintAt(imgPos.x, imgPos.y);
    }
  }, [zoom, panOffset, screenToImage, edgeDetection, tool, paintAt]);

  const handlePointerMove = useCallback((e) => {
    console.log('[PointerMove] pointerId:', e.pointerId, 'pointerType:', e.pointerType, 'clientX:', e.clientX, 'clientY:', e.clientY);
    e.preventDefault();
    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Update cursor preview
    if (cursorRef.current) {
      const size = brushSize * zoom;
      cursorRef.current.style.left = `${e.clientX - size / 2}px`;
      cursorRef.current.style.top = `${e.clientY - size / 2}px`;
      cursorRef.current.style.width = `${size}px`;
      cursorRef.current.style.height = `${size}px`;
      cursorRef.current.style.display = 'block';
    }

    // Two-finger pinch/pan
    if (pointers.size === 2 && pinchBaseRef.current) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = dist / pinchBaseRef.current.dist;
      const newZoom = Math.max(0.1, Math.min(10, pinchBaseRef.current.zoom * scale));
      setZoom(newZoom);
      return;
    }

    // Pan mode
    if (isPanningRef.current && panStartRef.current) {
      setPanOffset({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y)
      });
      return;
    }

    // Drawing
    if (isDrawingRef.current && pointers.size === 1) {
      const imgPos = screenToImage(e.clientX, e.clientY);
      if (lastPosRef.current) {
        paintLine(lastPosRef.current, imgPos);
      }
      lastPosRef.current = imgPos;
    }
  }, [brushSize, zoom, screenToImage, paintLine]);

  const handlePointerUp = useCallback((e) => {
    console.log(`[${e.type.toUpperCase()}] pointerId:`, e.pointerId, 'pointerType:', e.pointerType);
    try {
      if (e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
        console.log('[PointerCapture] released pointer capture success for ID:', e.pointerId);
      }
    } catch (err) {
      console.warn('[PointerCapture] releasePointerCapture failed:', err);
    }
    const pointers = activePointersRef.current;
    pointers.delete(e.pointerId);

    if (pointers.size === 0) {
      if (isDrawingRef.current) {
        pushHistory();
        isDrawingRef.current = false;
      }
      isPanningRef.current = false;
      panStartRef.current = null;
      pinchBaseRef.current = null;
      lastPosRef.current = null;
      sampledColorRef.current = null;
    }
  }, [pushHistory]);

  // ============================================================
  //  Touch event fallback handlers (highly reliable on Android)
  // ============================================================
  const handleTouchStart = useCallback((e) => {
    e.preventDefault(); // Prevents native scroll/zoom gestures and synthetic mouse/pointer events
    console.log('[TouchStart] touches count:', e.touches.length);
    const pointers = activePointersRef.current;
    
    // Clear and sync touches
    pointers.clear();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // Two-finger → pan/pinch
    if (e.touches.length === 2) {
      isDrawingRef.current = false;
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchBaseRef.current = { dist, zoom, panOffset: { ...panOffset } };
      return;
    }

    // Single touch → draw
    if (e.touches.length === 1) {
      isDrawingRef.current = true;
      const touch = e.touches[0];
      const imgPos = screenToImage(touch.clientX, touch.clientY);
      lastPosRef.current = imgPos;

      // Sample color for edge detection
      if (edgeDetection && tool === 'eraser') {
        const orig = originalDataRef.current;
        if (orig) {
          const px = Math.round(imgPos.x);
          const py = Math.round(imgPos.y);
          if (px >= 0 && px < orig.width && py >= 0 && py < orig.height) {
            const idx = (py * orig.width + px) * 4;
            sampledColorRef.current = {
              r: orig.data[idx],
              g: orig.data[idx + 1],
              b: orig.data[idx + 2]
            };
          }
        }
      }

      paintAt(imgPos.x, imgPos.y);
    }
  }, [zoom, panOffset, screenToImage, edgeDetection, tool, paintAt]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault(); // Prevents scroll/zoom and matching pointer/mouse events
    console.log('[TouchMove] touches count:', e.touches.length);
    const pointers = activePointersRef.current;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // Update cursor preview
    if (cursorRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const size = brushSize * zoom;
      cursorRef.current.style.left = `${touch.clientX - size / 2}px`;
      cursorRef.current.style.top = `${touch.clientY - size / 2}px`;
      cursorRef.current.style.width = `${size}px`;
      cursorRef.current.style.height = `${size}px`;
      cursorRef.current.style.display = 'block';
    }

    // Two-finger pinch/pan zoom
    if (e.touches.length === 2 && pinchBaseRef.current) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = dist / pinchBaseRef.current.dist;
      const newZoom = Math.max(0.1, Math.min(10, pinchBaseRef.current.zoom * scale));
      setZoom(newZoom);
      return;
    }

    // Drawing
    if (isDrawingRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const imgPos = screenToImage(touch.clientX, touch.clientY);
      if (lastPosRef.current) {
        paintLine(lastPosRef.current, imgPos);
      }
      lastPosRef.current = imgPos;
    }
  }, [brushSize, zoom, screenToImage, paintLine]);

  const handleTouchEnd = useCallback((e) => {
    console.log('[TouchEnd/Cancel] changedTouches count:', e.changedTouches.length);
    const pointers = activePointersRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      pointers.delete(touch.identifier);
    }

    if (pointers.size === 0) {
      if (isDrawingRef.current) {
        pushHistory();
        isDrawingRef.current = false;
      }
      isPanningRef.current = false;
      panStartRef.current = null;
      pinchBaseRef.current = null;
      lastPosRef.current = null;
      sampledColorRef.current = null;
    }
  }, [pushHistory]);

  // ============================================================
  //  Keyboard shortcuts
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spaceDownRef.current = true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, undo, redo]);

  // ============================================================
  //  Mouse wheel zoom
  // ============================================================
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(10, prev * delta)));
  }, []);

  // ============================================================
  //  Zoom controls
  // ============================================================
  const zoomIn = () => setZoom(prev => Math.min(10, prev * 1.25));
  const zoomOut = () => setZoom(prev => Math.max(0.1, prev * 0.8));
  const handleFitToScreen = () => {
    if (originalImageRef.current) fitToScreen(originalImageRef.current);
  };

  // ============================================================
  //  Apply — export transparent PNG
  // ============================================================
  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onApply(dataUrl);
  };

  // ============================================================
  //  Hide cursor on leave
  // ============================================================
  const handlePointerLeave = () => {
    if (cursorRef.current) cursorRef.current.style.display = 'none';
  };

  // ============================================================
  //  Render
  // ============================================================
  if (!isOpen) return null;

  return (
    <div className="eraser-modal-overlay">
      {/* Toolbar */}
      <div className="eraser-toolbar">
        <button
          className={tool === 'eraser' ? 'active' : ''}
          onClick={() => setTool('eraser')}
        >
          🧹 Eraser
        </button>
        <button
          className={tool === 'restore' ? 'active' : ''}
          onClick={() => setTool('restore')}
        >
          🔄 Restore
        </button>

        <span className="toolbar-divider" />

        <div className="slider-group">
          <label>Size</label>
          <input
            type="range" min="5" max="100" value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
          />
          <span className="slider-value">{brushSize}</span>
        </div>

        <div className="slider-group">
          <label>Hardness</label>
          <input
            type="range" min="0" max="100" value={brushHardness}
            onChange={(e) => setBrushHardness(parseInt(e.target.value))}
          />
          <span className="slider-value">{brushHardness}%</span>
        </div>

        <span className="toolbar-divider" />

        <div className="edge-toggle">
          <input
            type="checkbox"
            id="edge-detect-toggle"
            checked={edgeDetection}
            onChange={(e) => setEdgeDetection(e.target.checked)}
          />
          <label htmlFor="edge-detect-toggle">Edge Detect</label>
        </div>

        {edgeDetection && (
          <div className="slider-group">
            <label>Tolerance</label>
            <input
              type="range" min="10" max="150" value={colorTolerance}
              onChange={(e) => setColorTolerance(parseInt(e.target.value))}
            />
            <span className="slider-value">{colorTolerance}</span>
          </div>
        )}

        <span className="toolbar-divider" />

        <button onClick={zoomIn}>🔍+</button>
        <button onClick={zoomOut}>🔍−</button>
        <button onClick={handleFitToScreen}>⊞ Fit</button>

        <span className="toolbar-divider" />

        <button onClick={undo}>↩ Undo</button>
        <button onClick={redo}>↪ Redo</button>
        <button onClick={resetMask}>⟲ Reset</button>

        <span className="toolbar-divider" />

        <button className="btn-apply" onClick={handleApply}>✓ Apply</button>
        <button className="btn-cancel" onClick={onCancel}>✕ Cancel</button>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        className="eraser-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        />
      </div>

      {/* Custom brush cursor */}
      <div ref={cursorRef} className="eraser-cursor" style={{ display: 'none' }} />
    </div>
  );
}
