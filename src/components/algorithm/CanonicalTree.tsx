    import React, { useMemo } from 'react';
    import type { CanonicalLengths, CodeTable } from '../../contracts/types';

    interface CanonicalTreeProps {
    lengths: CanonicalLengths;
    codes: CodeTable | Uint32Array;
    }

    interface TreeNode {
    symbol: number | null;
    length: number;
    code: number;
    left: TreeNode | null;
    right: TreeNode | null;
    }

    export const CanonicalTree: React.FC<CanonicalTreeProps> = ({ lengths, codes }) => {
    const root = useMemo(() => {
        const activeEntries: { symbol: number; length: number; code: number }[] = [];

        for (let i = 0; i < 256; i++) {
        if (lengths[i] > 0) {
            const codeVal = typeof codes[i] === 'string' 
            ? parseInt(codes[i] as string, 2) 
            : Number((codes as Uint32Array)[i]);

            activeEntries.push({
            symbol: i,
            length: lengths[i],
            code: codeVal,
            });
        }
        }

        if (activeEntries.length === 0) {
        return null;
        }

        const head: TreeNode = {
        symbol: null,
        length: 0,
        code: 0,
        left: null,
        right: null,
        };

        for (const entry of activeEntries) {
        let currentNode = head;
        for (let i = entry.length - 1; i >= 0; i--) {
            const bitVal = (entry.code >> i) & 1;
            const isLeft = bitVal === 0;

            if (isLeft) {
            if (!currentNode.left) {
                currentNode.left = {
                symbol: null,
                length: entry.length - i,
                code: entry.code >> i,
                left: null,
                right: null,
                };
            }
            currentNode = currentNode.left;
            } else {
            if (!currentNode.right) {
                currentNode.right = {
                symbol: null,
                length: entry.length - i,
                code: entry.code >> i,
                left: null,
                right: null,
                };
            }
            currentNode = currentNode.right;
            }
        }
        currentNode.symbol = entry.symbol;
        }

        return head;
    }, [lengths, codes]);

    if (!root || (!root.left && !root.right && root.symbol === null)) {
        return <div className="canonical-tree-empty">Árbol vacío o sin símbolos activos</div>;
    }

    const renderNode = (node: TreeNode, label: string) => {
        const hasChildren = node.left !== null || node.right !== null;

        if (!hasChildren) {
        const charRepresentation =
            node.symbol !== null && node.symbol >= 32 && node.symbol <= 126
            ? String.fromCharCode(node.symbol)
            : `0x${node.symbol?.toString(16).padStart(2, '0')}`;

        return (
            <div className="tree-leaf" style={{ margin: '4px 0 4px 20px' }}>
            <code>
                {label}: Símbolo {charRepresentation} ({node.symbol}) | Código: {node.code.toString(2).padStart(node.length, '0')} (L: {node.length})
            </code>
            </div>
        );
        }

        return (
        <details open style={{ margin: '4px 0 4px 20px' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
            <code>{label} (Nivel {node.length})</code>
            </summary>
            <div className="tree-children" style={{ borderLeft: '1px dashed #ccc', paddingLeft: '10px' }}>
            {node.left && renderNode(node.left, '0')}
            {node.right && renderNode(node.right, '1')}
            </div>
        </details>
        );
    };

    return (
        <div className="canonical-tree-container">
        <h3>Árbol de Huffman Canónico</h3>
        {root.left && renderNode(root.left, '0')}
        {root.right && renderNode(root.right, '1')}
        </div>
    );
    };