'use client';

/**
 * Project-owned file hierarchy components with explicit spacing, hover feedback,
 * and visible folder disclosure states.
 *
 * 项目自有的文件层级组件，提供清晰间距、悬浮反馈与可见的文件夹展开状态。
 */

import {
  Collapsible,
  CollapsibleContent,
  type CollapsibleProps,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronRight, FileIcon, FolderIcon, FolderOpen } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';

interface FileProps extends HTMLAttributes<HTMLDivElement> {
  name: ReactNode;
  icon?: ReactNode;
}

interface FolderProps extends CollapsibleProps {
  name: ReactNode;
}

/**
 * Joins component and caller classes without introducing another dependency.
 * 在不引入额外依赖的前提下合并组件类名与调用方类名。
 */
function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

/**
 * Provides the glass file-tree surface and row spacing shared by all descendants.
 * 提供文件树后代共享的玻璃容器与行间距。
 */
export function Files({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={joinClassNames('not-prose mdx-files', className)}
      data-file-tree=""
      {...props}
    />
  );
}

/**
 * Renders a non-interactive file row with the same visual feedback as folder rows.
 * 渲染非交互式文件行，并与文件夹行保持一致的视觉反馈。
 */
export function File({
  name,
  icon = <FileIcon aria-hidden="true" />,
  className,
  ...props
}: FileProps) {
  return (
    <div
      className={joinClassNames('mdx-files__item mdx-files__file', className)}
      data-file-kind="file"
      {...props}
    >
      <span className="mdx-files__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="mdx-files__label">{name}</span>
      <span className="mdx-files__indicator" aria-hidden="true" />
    </div>
  );
}

/**
 * Renders a controlled or uncontrolled folder row with a rotating disclosure arrow.
 * Disabled or empty folders remain visible leaf nodes and cannot be expanded.
 *
 * 渲染支持受控或非受控状态的文件夹行，并使用旋转箭头显示展开状态。
 * 禁用或空文件夹仍作为可见叶节点展示，但不可展开。
 */
export function Folder({
  name,
  children,
  className,
  defaultOpen = false,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  ...props
}: FolderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const hasChildren = children !== undefined && children !== null;
  const isExpandable = hasChildren && !disabled;
  const isOpen = isExpandable && (controlledOpen ?? uncontrolledOpen);

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Collapsible
      className={joinClassNames('mdx-files__folder', className)}
      data-expandable={isExpandable ? 'true' : 'false'}
      data-file-tree-folder=""
      disabled={!isExpandable}
      open={isOpen}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <CollapsibleTrigger className="mdx-files__item mdx-files__trigger">
        <span className="mdx-files__icon" aria-hidden="true">
          {isOpen ? <FolderOpen /> : <FolderIcon />}
        </span>
        <span className="mdx-files__label">{name}</span>
        <span className="mdx-files__indicator" aria-hidden="true">
          {isExpandable ? <ChevronRight /> : null}
        </span>
      </CollapsibleTrigger>
      {hasChildren ? (
        <CollapsibleContent className="mdx-files__content">
          <div className="mdx-files__children">{children}</div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
