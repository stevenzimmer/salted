"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  UIEvent,
} from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTO_ADVANCE_MS = 6_000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToAutoplayEnvironment(onChange: () => void) {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  reducedMotion.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    reducedMotion.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function canAutoplay() {
  return !document.hidden && !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function scrollToSlide(
  viewport: HTMLDivElement | null,
  index: number,
  count: number,
) {
  if (!viewport || count === 0) return;

  const nextIndex = (index + count) % count;
  viewport.scrollTo({
    left: nextIndex * viewport.clientWidth,
    behavior: index < 0 || index >= count ? "instant" : "auto",
  });
}

type HeroProductCarouselProps = {
  items: { id: string; name: string; content: ReactNode }[];
};

export function HeroProductCarousel({ items }: HeroProductCarouselProps) {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const environmentAllowsAutoplay = useSyncExternalStore(
    subscribeToAutoplayEnvironment,
    canAutoplay,
    () => false,
  );
  const isAutoAdvancing =
    environmentAllowsAutoplay && !isPaused && !isHovered && !hasFocus;

  useEffect(() => {
    if (!isAutoAdvancing || items.length < 2) return;

    const timeout = window.setTimeout(() => {
      scrollToSlide(viewportRef.current, activeIndex + 1, items.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isAutoAdvancing, items.length]);

  if (items.length === 0) return null;

  function goToSlide(index: number) {
    scrollToSlide(viewportRef.current, index, items.length);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") setIsHovered(true);
  }

  function handlePointerLeave() {
    setIsHovered(false);
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    setHasFocus(!event.target.closest("[data-carousel-playback]"));
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setHasFocus(false);
    }
  }

  function handlePlaybackToggle() {
    setIsPaused((paused) => !paused);
  }

  function handlePrevious() {
    goToSlide(activeIndex - 1);
  }

  function handleNext() {
    goToSlide(activeIndex + 1);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    if (viewport.clientWidth === 0) return;

    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = activeIndex - 1;
        break;
      case "ArrowRight":
        nextIndex = activeIndex + 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const viewport = viewportRef.current;
    if (
      event.target instanceof HTMLElement &&
      viewport?.contains(event.target)
    ) {
      // Keep keyboard focus in the carousel when its current slide becomes inert.
      viewport.focus({ preventScroll: true });
    }
    goToSlide(nextIndex);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Explore the menu"
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
    >
      <div
        id={viewportId}
        ref={viewportRef}
        role="group"
        aria-label="Menu products"
        tabIndex={0}
        className="hero-carousel-viewport flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}: ${item.name}`}
            aria-hidden={index !== activeIndex}
            inert={index !== activeIndex}
            className="w-full shrink-0 snap-start"
          >
            {item.content}
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <>
          <div className="mt-4 flex items-center justify-between min-[360px]:gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-foreground/40 shadow-none min-[360px]:size-11"
              aria-label="Previous product"
              aria-controls={viewportId}
              onClick={handlePrevious}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <div role="group" aria-label="Choose a product" className="flex">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show ${item.name}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-controls={viewportId}
                  className="group flex min-h-11 w-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-offset-0 xl:w-7"
                  onClick={() => goToSlide(index)}
                >
                  <span className="size-1.5 rounded-full bg-foreground/45 transition-colors group-hover:bg-primary group-aria-[current=true]:bg-primary motion-reduce:transition-none" />
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-foreground/40 shadow-none min-[360px]:size-11"
              aria-label="Next product"
              aria-controls={viewportId}
              onClick={handleNext}
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>

        </>
      ) : null}
      <p
        className="sr-only"
        role="status"
        aria-live={isAutoAdvancing ? "off" : "polite"}
        aria-atomic="true"
      >
        {items[activeIndex].name}, {activeIndex + 1} of {items.length}
      </p>
    </div>
  );
}
