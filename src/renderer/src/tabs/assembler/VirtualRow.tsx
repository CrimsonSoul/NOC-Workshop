import React, { memo } from "react";
import { ListChildComponentProps } from "react-window";
import { ContactCard } from "../../components/ContactCard";
import { VirtualRowData } from "./types";

export const VirtualRow = memo(
  ({ index, style, data }: ListChildComponentProps<VirtualRowData>) => {
    const { log, contactMap, groupMap, onContextMenu } = data;
    const { email, source } = log[index];
    const contact = contactMap.get(email.toLowerCase());
    const name = contact ? contact.name : email.split("@")[0];
    const title = contact?.title;
    const phone = contact?.phone;
    const membership = groupMap.get(email.toLowerCase()) || [];

    return (
      <div
        style={style}
        onContextMenu={(e) => onContextMenu(e, email, !contact)}
      >
        <ContactCard
          key={email}
          name={name}
          email={email}
          title={title}
          phone={phone}
          groups={membership}
          sourceLabel={source === "manual" ? "MANUAL" : undefined}
          style={{ height: "100%" }}
        />
      </div>
    );
  }
);
