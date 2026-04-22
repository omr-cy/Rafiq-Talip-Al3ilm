type BackHandler = () => void;

class BackButtonManager {
  private handlers: BackHandler[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", () => {
        if (this.handlers.length > 0) {
          const handler = this.handlers.pop();
          if (handler) handler();
        }
      });
    }
  }

  register(handler: BackHandler) {
    this.handlers.push(handler);
    window.history.pushState({ backHandlerIndex: this.handlers.length }, "");
  }

  unregister() {
    // Only go back if we are the ones who pushed the state
    if (this.handlers.length > 0) {
      this.handlers.pop();
      window.history.back();
    }
  }
}

export const backButtonManager = new BackButtonManager();
