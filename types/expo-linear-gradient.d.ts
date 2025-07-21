declare module 'expo-linear-gradient' {
  import { ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    /**
     * An array of colors that represent stops in the gradient.
     */
    colors: string[];

    /**
     * An array of [x, y] where x and y are floats.
     * They represent the position that the gradient
     * starts at, as a fraction of the overall size of the gradient.
     * For example, [0.1, 0.1] means that the gradient will start 10%
     * from the top and 10% from the left.
     */
    start?: [number, number] | { x: number; y: number };

    /**
     * Same as start but for the end of the gradient.
     */
    end?: [number, number] | { x: number; y: number };

    /**
     * An array of numbers defining the location of each gradient color stop.
     * The values must be in ascending order, and must have the same count as colors.
     */
    locations?: number[];
  }

  export default function LinearGradient(props: LinearGradientProps): JSX.Element;
}
