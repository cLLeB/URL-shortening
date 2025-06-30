import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6', 'w-6', 'text-primary-600');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with custom color', () => {
    render(<LoadingSpinner color="white" />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('text-white');
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('custom-class');
  });

  it('renders all size variants correctly', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    const expectedClasses = ['h-4 w-4', 'h-6 w-6', 'h-8 w-8', 'h-12 w-12'];

    sizes.forEach((size, index) => {
      const { unmount } = render(<LoadingSpinner size={size} />);
      
      const spinner = screen.getByRole('status', { hidden: true });
      const [heightClass, widthClass] = expectedClasses[index].split(' ');
      
      expect(spinner).toHaveClass(heightClass, widthClass);
      
      unmount();
    });
  });

  it('renders all color variants correctly', () => {
    const colors = ['primary', 'white', 'gray'] as const;
    const expectedClasses = ['text-primary-600', 'text-white', 'text-gray-600'];

    colors.forEach((color, index) => {
      const { unmount } = render(<LoadingSpinner color={color} />);
      
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass(expectedClasses[index]);
      
      unmount();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveAttribute('role', 'status');
  });

  it('contains SVG with proper structure', () => {
    render(<LoadingSpinner />);
    
    const svg = screen.getByRole('status', { hidden: true }).querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-full', 'w-full');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('contains circle and path elements', () => {
    render(<LoadingSpinner />);
    
    const svg = screen.getByRole('status', { hidden: true }).querySelector('svg');
    const circle = svg?.querySelector('circle');
    const path = svg?.querySelector('path');
    
    expect(circle).toBeInTheDocument();
    expect(path).toBeInTheDocument();
    
    expect(circle).toHaveClass('opacity-25');
    expect(path).toHaveClass('opacity-75');
  });
});
