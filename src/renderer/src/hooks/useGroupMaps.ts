import { useMemo } from 'react';
import { GroupMap } from '@shared/ipc';

export const useGroupMaps = (groups: GroupMap) => {
  return useMemo(() => {
    const map = new Map<string, Set<string>>();

    // 1. Build Map<Email, Set<Group>>
    // Iterating groups first ensures we process each group once.
    // Using Set handles potential duplicate emails in the source data cleanly.
    Object.entries(groups).forEach(([groupName, emails]) => {
      for (const email of emails) {
        const key = email.toLowerCase();
        let set = map.get(key);
        if (!set) {
          set = new Set();
          map.set(key, set);
        }
        set.add(groupName);
      }
    });

    // 2. Convert to Map<Email, Group[]> and Map<Email, GroupString>
    const groupMap = new Map<string, string[]>();
    const groupStringMap = new Map<string, string>();

    for (const [email, set] of map) {
      const sortedGroups = Array.from(set).sort();
      groupMap.set(email, sortedGroups);
      groupStringMap.set(email, sortedGroups.join(', '));
    }

    return { groupMap, groupStringMap };
  }, [groups]);
};
