"use client";

import * as React from "react";
import { Tooltip } from "./tooltip";
import { TableHeadBase, type TableHeadProps as ServerTableHeadProps } from "./table";

// The package root's TableHead: the server-safe part plus `description`, the
// standard's definition (a dotted underline and a tooltip on the label, never
// an info icon). The tooltip is a client component, so this head lives in the
// client entry only; "@curvgroup/design-system/table" keeps the plain one.

export interface TableHeadProps extends ServerTableHeadProps {
  /**
   * A definition for the column: a dotted underline and a tooltip on the
   * label. On a sortable head the sort button is the tooltip's trigger (hover
   * or focus); otherwise the label takes a focus stop of its own.
   */
  description?: React.ReactNode;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(({ description, ...props }, ref) => (
  <TableHeadBase
    ref={ref}
    definition={description == null || description === "" ? undefined : { wrap: (trigger) => <Tooltip content={description}>{trigger}</Tooltip> }}
    {...props}
  />
));
TableHead.displayName = "TableHead";
