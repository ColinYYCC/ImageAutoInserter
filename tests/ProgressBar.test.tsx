import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // 使用 getAllByText 因为有两个元素都包含 100.0%
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
});
