import React from "react";
import { SortConfig } from "./types";

type SortableHeaderProps = {
  label: string;
  sortKey?: SortConfig["key"];
  currentSort: SortConfig;
  onSort: (key: SortConfig["key"]) => void;
  flex?: number | string;
  width?: string;
  align?: "left" | "right";
  paddingLeft?: string;
};

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  flex,
  width,
  align = "left",
  paddingLeft,
}) => {
  const isSorted = sortKey && currentSort.key === sortKey;

  return (
    <div
      style={{
        flex: flex,
        width: width,
        textAlign: align,
        paddingLeft: paddingLeft,
        cursor: sortKey ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        userSelect: "none",
      }}
      onClick={() => sortKey && onSort(sortKey)}
    >
      {label}
      {isSorted && (
        <span style={{ fontSize: "10px", color: "var(--color-text-primary)" }}>
          {currentSort.direction === "asc" ? "▲" : "▼"}
        </span>
      )}
    </div>
  );
};
