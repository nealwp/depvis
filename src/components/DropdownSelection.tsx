import React from 'react';
import { exampleData } from '../ModuleCache.js';
import { useQuery } from '../useQuery.js';

function DropdownSelection() {
    const sortedOptions = [...exampleData].sort((a, b) => a.label.localeCompare(b.label));

    const [query, setQuery] = useQuery()

    const handleChange = (event: any) => {
        setQuery([event.target.value])
    };

    return (
            <div>
            <label htmlFor="simple-dropdown">Choose:</label>
            <select
            id="object-dropdown"
            value={query}
            onChange={handleChange}
            >
            {sortedOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                        {option.name}
                        </option>
                        ))}
            </select>
            </div>
           );
}

export default DropdownSelection;

