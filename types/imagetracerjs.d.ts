declare module 'imagetracerjs' {
  const ImageTracer: {
    imagedataToSVG: (img: ImageData, options?: Record<string, unknown>) => string;
    imageToSVG: (url: string, callback: (svg: string) => void, options?: Record<string, unknown>) => void;
  };
  export default ImageTracer;
}
