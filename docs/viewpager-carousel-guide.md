# ViewPager & Carousel Optimization Guide

This guide documents the implementation and optimization of the `DashboardViewPager` component, designed to provide a high-performance, horizontal-scrolling tab system similar to native mobile carousels.

## Architecture

The system uses a native-scrolling approach combined with React state synchronization.

- **Container**: A fixed-position `div` with `overflow-x: auto` and `snap-x snap-mandatory`.
- **Children**: Each tab is a full-width, full-height `div` with `snap-center`.
- **Synchronization**: 
    - **State -> Scroll**: Clicking a navbar item updates `appState`, which triggers a `useEffect` that calls `scrollIntoView({ behavior: 'smooth', inline: 'center' })`.
    - **Scroll -> State**: A scroll listener tracks the scroll position, identifies the most visible child, and debounces an update back to `appState`.

## Key Optimizations for Mobile

To ensure 60fps performance on mobile devices, the following optimizations were implemented:

### 1. CSS Layering & GPU Acceleration
We use specialized classes in `src/index.css` to force the browser to treat scrolling layers efficiently:

```css
.smooth-scroll {
  -webkit-overflow-scrolling: touch; /* Native-like momentum scrolling on iOS */
  overscroll-behavior-y: contain;    /* Prevents scroll-chaining to the body */
  will-change: scroll-position;      /* Hints the browser to optimize for scrolling */
}

.optimize-gpu {
  backface-visibility: hidden;
  perspective: 1000px;
  transform: translateZ(0);          /* Forces GPU layer promotion */
}
```

### 2. Eliminating Expensive Effects
Heavy CSS effects like `backdrop-blur` are disabled on performance-critical containers (like the Global Navbar) because they require live-calculating pixels behind the element during every frame of a transition.

### 3. Animation Strategy: Lightweight vs. Heavy
- **Framer Motion**: Reserved for discrete, single-instance UI elements (like alerts or modals).
- **Standard CSS/HTML**: Used for grid items (like `CardPack`) that repeat many times. Using `motion.div` on hundreds of grid items causes significant frame drops during layout shifts or tab transitions.

### 4. Layout Stability
- **Fixed Dimensions**: The main ViewPager uses `fixed inset-0` to remain detached from document flow, preventing layout recalculations during keyboard events.
- **Keyboard Handling**: Containers are set to `items-start` on mobile with `overflow-y-auto` so that when the soft keyboard appears, the user can scroll to hidden input fields without the entire viewport "jumping" or collapsing.

## Troubleshooting

- **Black Screen**: Often caused by aggressive `transform-gpu` or `translate3d(0,0,0)` on the root `*` selector, or by failing `opacity-0` transitions. Ensure GPU promotion is scoped only to containers that actually scroll.
- **Scroll Tearing**: Ensure `scroll-behavior: smooth` is NOT applied globally to the body, as it conflicts with programmatic `scrollIntoView` logic.
- **Laggy Transitions**: Check for `AnimatePresence` blocks that might be re-rendering during the scroll. Memoize child views using `React.memo` to prevent redundant renders.
