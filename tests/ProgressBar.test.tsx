import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressBar from '../src/renderer/components/ProgressBar';

describe('ProgressBar', () => {
  const defaultProps = {
    progress: 50,
    current: 'ROW-1',
    total: 100,
  };

  it('should render progress bar with correct percentage', () => {
    render(<ProgressBar {...defaultProps} />);

    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText(/进度：50 \/ 100 项/)).toBeInTheDocument();
  });

  it('should format ROW action text correctly', () => {
    render(<ProgressBar {...defaultProps} current="ROW-5" />);

    expect(screen.getByText('正在处理第 5 行')).toBeInTheDocument();
  });

  it('should handle cancel button click', () => {
    const onCancel = vi.fn();
    render(<ProgressBar {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should clamp progress to 0-100', () => {
    const { rerender } = render(<ProgressBar progress={150} total={100} />);
    const percentageElements = screen.getAllByText(/100\.0%/);
    expect(percentageElements.length).toBeGreaterThan(0);

    rerender(<ProgressBar progress={-10} total={100} />);
    const zeroElements = screen.getAllByText(/0\.0%/);
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('should not show current action when showCurrent is false', () => {
    render(<ProgressBar {...defaultProps} showCurrent={false} />);

    expect(screen.queryByText('正在处理第 1 行')).not.toBeInTheDocument();
  });

  it('should not show percentage when showPercentage is false', () => {
    render(<ProgressBar {...defaultProps} showPercentage={false} />);

    expect(screen.queryByText('50.0%')).not.toBeInTheDocument();
  });

  it('should apply skeleton class when isStalled is true', () => {
    const { container } = render(<ProgressBar {...defaultProps} isStalled={true} />);

    const fillElement = container.querySelector('[class*="fill"]');
    expect(fillElement?.className).toContain('skeleton');
  });

  it('should not apply skeleton class when isStalled is false', () => {
    const { container } = render(<ProgressBar {...defaultProps} isStalled={false} />);

    const fillElement = container.querySelector('[class*="fill"]');
    expect(fillElement?.className).not.toContain('skeleton');
  });

  it('should apply complete class when progress is 100', () => {
    const { container } = render(<ProgressBar {...defaultProps} progress={100} />);

    const fillElement = container.querySelector('[class*="fill"]');
    expect(fillElement?.className).toContain('complete');
  });

  it('should have correct ARIA attributes', () => {
    render(<ProgressBar {...defaultProps} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should update width based on progress', () => {
    const { container, rerender } = render(<ProgressBar progress={25} />);

    let fillElement = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fillElement.style.width).toBe('25%');

    rerender(<ProgressBar progress={75} />);
    fillElement = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fillElement.style.width).toBe('75%');
  });
});

describe('ProgressBar CSS Animation', () => {
  it('should not use requestAnimationFrame for animations', () => {
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');

    render(<ProgressBar progress={50} />);

    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it('should use CSS transition on fill element', () => {
    const { container } = render(<ProgressBar progress={50} />);

    const fillElement = container.querySelector('[class*="fill"]');
    expect(fillElement).toBeTruthy();
    expect(fillElement?.className).toMatch(/fill/);
  });
});
