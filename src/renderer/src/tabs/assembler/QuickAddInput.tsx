import React, { useState, useRef, useEffect, useMemo } from "react";
import { Contact } from "@shared/ipc";
import { useDebounce } from "../../hooks/useDebounce";
import { Input } from "../../components/Input";

type QuickAddInputProps = {
  contacts: Contact[];
  onQuickAdd: (email: string) => void;
};

export const QuickAddInput: React.FC<QuickAddInputProps> = ({
  contacts,
  onQuickAdd,
}) => {
  const [adhocInput, setAdhocInput] = useState("");
  const debouncedAdhocInput = useDebounce(adhocInput, 300);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionWrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!debouncedAdhocInput || !showSuggestions) return [];
    const lower = debouncedAdhocInput.toLowerCase();
    return contacts.filter((c) => c._searchString.includes(lower)).slice(0, 5);
  }, [debouncedAdhocInput, showSuggestions, contacts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionWrapperRef.current &&
        !suggestionWrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickAdd = (emailOverride?: string) => {
    const email = emailOverride || adhocInput.trim();
    if (!email) return;
    onQuickAdd(email);
    setAdhocInput("");
    setShowSuggestions(false);
  };

  return (
    <div
      ref={suggestionWrapperRef}
      style={{ position: "relative", marginBottom: "0", width: "100%" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          height: "24px",
          marginBottom: "12px",
          padding: "0",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--color-text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Quick Add
        </div>
      </div>
      <Input
        placeholder="Add by email..."
        value={adhocInput}
        style={{
          fontSize: "14px",
          padding: "8px 12px",
          height: "42px",
          borderRadius: "8px",
        }}
        onChange={(e) => {
          setAdhocInput(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleQuickAdd();
            e.currentTarget.blur();
          }
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--color-bg-surface)",
            border: "var(--border-subtle)",
            borderRadius: "6px",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {suggestions.map((c) => (
            <div
              key={c.email}
              onClick={() => handleQuickAdd(c.email)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--color-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#3B82F6",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name || c.email}
                {c.name && (
                  <span
                    style={{
                      color: "var(--color-text-tertiary)",
                      marginLeft: "6px",
                      fontSize: "12px",
                    }}
                  >
                    {c.email}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
