declare global {
  namespace NodeJS {
    interface Global {
      queue: any[];
      isPlaying: boolean = false;
      skip: boolean = false;
    }
  }
}
