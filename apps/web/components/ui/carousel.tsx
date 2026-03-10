'use client';

import * as React from 'react';

import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextValue = {
  api: CarouselApi | undefined;
  orientation: 'horizontal' | 'vertical';
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) {
    throw new Error('Carousel components must be used within a Carousel');
  }
  return ctx;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = 'horizontal', opts, setApi, plugins, className, children, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins
  );

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      (ref as React.RefCallback<HTMLDivElement>)?.(node);
      carouselRef(node);
    },
    [ref, carouselRef]
  );

  const contextValue = React.useMemo<CarouselContextValue>(
    () => ({ api, orientation }),
    [api, orientation]
  );

  React.useEffect(() => {
    if (!api || !setApi) {
      return;
    }
    setApi(api);
  }, [api, setApi]);

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        ref={setRef}
        className={cn('relative overflow-hidden', className)}
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = 'Carousel';

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex',
        'gap-0',
        'm-[calc(var(--carousel-spacing)*-1)]',
        '[-webkit-backface-visibility:hidden] [backface-visibility:hidden]',
        className
      )}
      data-slot="carousel-content"
      {...props}
    />
  )
);
CarouselContent.displayName = 'CarouselContent';

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        'pl-[var(--carousel-spacing)]',
        className
      )}
      data-slot="carousel-item"
      {...props}
    />
  )
);
CarouselItem.displayName = 'CarouselItem';

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = 'outline', size = 'icon', onClick, ...props }, ref) => {
    const { api } = useCarousel();
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        className={cn(
          'absolute size-8 rounded-full',
          'top-1/2 -translate-y-1/2',
          'left-2 border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white',
          'z-10',
          className
        )}
        data-slot="carousel-previous"
        onClick={(e) => {
          api?.scrollPrev();
          onClick?.(e);
        }}
        {...props}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  }
);
CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = 'outline', size = 'icon', onClick, ...props }, ref) => {
    const { api } = useCarousel();
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        className={cn(
          'absolute size-8 rounded-full',
          'top-1/2 -translate-y-1/2',
          'right-2 border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white',
          'z-10',
          className
        )}
        data-slot="carousel-next"
        onClick={(e) => {
          api?.scrollNext();
          onClick?.(e);
        }}
        {...props}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  }
);
CarouselNext.displayName = 'CarouselNext';

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
};
