import React, { useState, useEffect, useCallback } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Shield } from 'lucide-react';
import {
  getPoolConfigs,
  savePoolConfigs,
  getNodeStatus,
} from '../lib/supabase-pool';
import type {
  SupabaseNodeConfig,
  SupabaseNodeStatus,
} from '../lib/supabase-pool';
import { formatFileSize } from '../lib/formatters';

interface DatabasePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabasePoolModal: React.FC<DatabasePoolModalProps> = ({ isOpen, onClose }) => {
  const [nodes, setNodes] = useState<SupabaseNodeConfig[]>(() => getPoolConfigs());
  const [statuses, setStatuses] = useState<Record<string, SupabaseNodeStatus>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const checkAllNodes = useCallback(async (configNodes: SupabaseNodeConfig[]) => {
    setIsChecking(true);
    const newStatuses: Record<string, SupabaseNodeStatus> = {};
    for (const node of configNodes) {
      const status = await getNodeStatus(node);
      newStatuses[node.id] = status;
    }
    setStatuses(newStatuses);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      const saved = getPoolConfigs();
      Promise.resolve().then(async () => {
        if (ignore) return;
        setIsChecking(true);
        const newStatuses: Record<string, SupabaseNodeStatus> = {};
        for (const node of saved) {
          const status = await getNodeStatus(node);
          if (ignore) return;
          newStatuses[node.id] = status;
        }
        if (!ignore) {
          setStatuses(newStatuses);
          setIsChecking(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateNode = (id: string, field: 'url' | 'anonKey' | 'name', value: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === id) {
          const updated = { ...node, [field]: value.trim() };
          updated.isConfigured = Boolean(updated.url && updated.anonKey);
          return updated;
        }
        return node;
      })
    );
  };

  const handleSaveAll = () => {
    savePoolConfigs(nodes);
    setSaveSuccess(true);
    checkAllNodes(nodes);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-md space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#171717] text-white flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">
                5-Node Supabase Database Pool (Load Balancer)
              </h2>
              <p className="text-xs text-[#666666]">
                Smart routing for files up to 999MB across free-tier Supabase instances
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#171717] p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-lg text-xs text-[#166534] flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Free-tier Supabase projects include 500MB to 1GB storage. DropHour's smart load balancer automatically evaluates remaining space and routes large files to the least-utilized healthy node.
          </p>
        </div>

        {/* Node List */}
        <div className="space-y-3">
          {nodes.map((node, index) => {
            const status = statuses[node.id];
            const isEditing = editingNodeId === node.id;

            return (
              <div
                key={node.id}
                className={`border rounded-lg p-4 transition-colors ${
                  node.isPrimary
                    ? 'border-[#2563EB]/40 bg-[#F8FAFC]'
                    : 'border-[#D9D9D9] bg-[#FFFFFF]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#171717] text-white text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-[#171717]">{node.name}</span>
                    {node.isPrimary && (
                      <span className="text-[10px] font-semibold bg-[#2563EB] text-white px-2 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                          status.isHealthy
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : node.isConfigured
                            ? 'bg-[#FEE2E2] text-[#991B1B]'
                            : 'bg-[#F3F4F6] text-[#6B7280]'
                        }`}
                      >
                        {status.isHealthy ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                            <span>Online</span>
                          </>
                        ) : node.isConfigured ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                            <span>Unreachable</span>
                          </>
                        ) : (
                          <span>Empty</span>
                        )}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingNodeId(isEditing ? null : node.id)}
                      className="text-xs text-[#2563EB] hover:underline font-medium"
                    >
                      {isEditing ? 'Collapse' : 'Configure'}
                    </button>
                  </div>
                </div>

                {/* Capacity Bar */}
                {status && status.isHealthy && (
                  <div className="space-y-1 mb-2 pt-1 text-xs text-[#666666]">
                    <div className="flex justify-between items-center text-[11px]">
                      <span>
                        Used: {formatFileSize(status.estimatedUsedBytes)} ({status.activeFilesCount} files)
                      </span>
                      <span className="font-semibold text-[#171717]">
                        Remaining: {formatFileSize(status.remainingBytes)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{
                          width: `${Math.min(
                            100,
                            (status.estimatedUsedBytes / node.capacityBytes) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Editable Fields */}
                {isEditing && (
                  <div className="space-y-2.5 pt-2 border-t border-[#D9D9D9] text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-[#666666] mb-1">
                        Supabase Project URL:
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyzproject.supabase.co"
                        value={node.url}
                        onChange={(e) => handleUpdateNode(node.id, 'url', e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-[#FFFFFF] border border-[#D9D9D9] rounded font-mono focus:outline-none focus:border-[#171717]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#666666] mb-1">
                        Supabase Anon Key:
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={node.anonKey}
                        onChange={(e) => handleUpdateNode(node.id, 'anonKey', e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-[#FFFFFF] border border-[#D9D9D9] rounded font-mono focus:outline-none focus:border-[#171717]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D9D9D9]">
          <button
            type="button"
            onClick={() => checkAllNodes(nodes)}
            disabled={isChecking}
            className="flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#171717] px-3 py-1.5 rounded border border-[#D9D9D9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Test Connections</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-[#16A34A] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved successfully!</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-medium transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
