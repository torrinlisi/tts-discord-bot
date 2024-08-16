declare global {
  namespace NodeJS {
    interface Global {
      queue: any[];
    }
  }
}
