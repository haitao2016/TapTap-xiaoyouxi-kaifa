declare module 'raindrop-ai' {
  export interface RaindropOptions {
    writeKey?: string;
  }

  export class Raindrop {
    constructor(options: RaindropOptions);
    track(data: unknown): Promise<void>;
    flush?(): Promise<void>;
  }

  export default Raindrop;
}
