import React from "react";

export const Preview = ({ html }) => {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const update = () => setWidth(ref.current?.clientWidth || 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const scale = width ? width / 800 : 0.3;
  return (
    <div ref={ref} className="preview" style={{ height: `${1000 * scale}px` }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 800, height: 1000 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
