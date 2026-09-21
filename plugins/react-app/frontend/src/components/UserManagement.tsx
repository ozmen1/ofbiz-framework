import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Shield, Key, Search, Plus, RefreshCw, CheckCircle2,
  AlertCircle, Lock, Unlock, UserCheck, UserX, ChevronRight, X,
  ShieldCheck, Loader2, ChevronLeft, Trash2, Network
} from 'lucide-react';
import {
  fetchUserLogins,
  fetchUserLoginDetail,
  updateUserLoginStatusAdmin,
  adminResetUserPassword,
  addUserSecurityGroup,
  removeUserSecurityGroup,
  fetchSecurityGroups,
  fetchSecurityGroupPermissions,
  addPermissionToSecurityGroup,
  removePermissionFromSecurityGroup,
  fetchUserAdminMetadata,
  fetchRoleTypesAdmin,
  deleteRoleTypeAdmin,
  UserLoginAdminItem,
  UserLoginDetail,
  SecurityGroupAdminItem,
  SecurityGroupDetailResponse,
  UserAdminMetadataResponse,
  RoleTypeAdminItem
} from '../services/api';
import { useTranslation } from '../i18n';
import { CreateUserModal } from './CreateUserModal';
import { CreateSecurityGroupModal } from './CreateSecurityGroupModal';
import { CreateRoleTypeModal } from './CreateRoleTypeModal';

type MainTab = 'users' | 'securityGroups' | 'roleTypes';


export const UserManagement: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.users;
  const common = translations.common;

  // Active Top Tab
  const [activeTab, setActiveTab] = useState<MainTab>('users');

  // =====================
  // Users List State
  // =====================
  const [users, setUsers] = useState<UserLoginAdminItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED' | 'LOCKED'>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // =====================
  // User Drawer State
  // =====================
  const [selectedUserLoginId, setSelectedUserLoginId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserLoginDetail | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState<boolean>(false);
  const [assignGroupId, setAssignGroupId] = useState<string>('');
  const [isAssigningGroup, setIsAssigningGroup] = useState<boolean>(false);

  // Reset password state inside drawer
  const [showResetPasswordForm, setShowResetPasswordForm] = useState<boolean>(false);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetVerifyPassword, setResetVerifyPassword] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  // =====================
  // Security Groups Tab State
  // =====================
  const [securityGroups, setSecurityGroups] = useState<SecurityGroupAdminItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupPermissionsDetail, setGroupPermissionsDetail] = useState<SecurityGroupDetailResponse | null>(null);
  const [loadingGroupPermissions, setLoadingGroupPermissions] = useState<boolean>(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [permSearchQuery, setPermSearchQuery] = useState<string>('');
  const [isManagingPermission, setIsManagingPermission] = useState<boolean>(false);

  // =====================
  // Metadata & Modals
  // =====================
  const [metadata, setMetadata] = useState<UserAdminMetadataResponse['metadata']>({
    securityGroups: [],
    parties: []
  });
  const [isCreateUserOpen, setIsCreateUserOpen] = useState<boolean>(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false);
  const [isCreateRoleTypeOpen, setIsCreateRoleTypeOpen] = useState<boolean>(false);

  // =====================
  // Role Types Tab State
  // =====================
  const [roleTypes, setRoleTypes] = useState<RoleTypeAdminItem[]>([]);
  const [loadingRoleTypes, setLoadingRoleTypes] = useState<boolean>(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>('');
  const [deletingRoleTypeId, setDeletingRoleTypeId] = useState<string | null>(null);

  // Alert Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Metadata
  useEffect(() => {
    fetchUserAdminMetadata()
      .then(res => setMetadata(res.metadata))
      .catch(() => {});
  }, []);

  // Load Role Types
  const loadRoleTypes = useCallback(async () => {
    setLoadingRoleTypes(true);
    try {
      const res = await fetchRoleTypesAdmin();
      setRoleTypes(res.roleTypes || []);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Rol tipleri yüklenemedi.');
    } finally {
      setLoadingRoleTypes(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'roleTypes') {
      loadRoleTypes();
    }
  }, [activeTab, loadRoleTypes]);

  const handleDeleteRoleType = async (roleTypeId: string) => {
    if (!window.confirm(t.confirmDeleteRoleType)) return;
    setDeletingRoleTypeId(roleTypeId);
    try {
      await deleteRoleTypeAdmin(roleTypeId);
      showFeedback('success', t.roleTypeDeletedSuccess);
      loadRoleTypes();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Rol tipi silinemedi.');
    } finally {
      setDeletingRoleTypeId(null);
    }
  };


  // ==========================================
  // Load Users List
  // ==========================================
  const loadUsers = useCallback(async (pageIdx = viewIndex) => {
    setLoadingUsers(true);
    try {
      const res = await fetchUserLogins({
        search: searchQuery.trim() || undefined,
        statusId: statusFilter,
        groupId: groupFilter || undefined,
        viewIndex: pageIdx,
        viewSize
      });
      setUsers(res.userLogins || []);
      setTotalCount(res.totalCount || 0);
      setViewIndex(res.viewIndex || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kullanıcı listesi yüklenemedi.';
      showFeedback('error', msg);
    } finally {
      setLoadingUsers(false);
    }
  }, [searchQuery, statusFilter, groupFilter, viewIndex, viewSize]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(0);
    }
  }, [loadUsers, activeTab, statusFilter, groupFilter]);

  // ==========================================
  // Load User Detail
  // ==========================================
  const loadUserDetail = useCallback(async (userLoginId: string) => {
    setLoadingUserDetail(true);
    try {
      const res = await fetchUserLoginDetail(userLoginId);
      setUserDetail(res.userDetail);
      setShowResetPasswordForm(false);
      setResetNewPassword('');
      setResetVerifyPassword('');
      setAssignGroupId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kullanıcı detayı yüklenemedi.';
      showFeedback('error', msg);
    } finally {
      setLoadingUserDetail(false);
    }
  }, []);

  const handleSelectUser = (userLoginId: string) => {
    setSelectedUserLoginId(userLoginId);
    loadUserDetail(userLoginId);
  };

  const handleCloseDrawer = () => {
    setSelectedUserLoginId(null);
    setUserDetail(null);
  };

  // ==========================================
  // Toggle Status / Unlock User
  // ==========================================
  const handleToggleStatus = async (userLoginId: string, currentEnabled: string) => {
    try {
      const newEnabled = currentEnabled === 'Y' ? 'N' : 'Y';
      const res = await updateUserLoginStatusAdmin({
        userLoginId,
        enabled: newEnabled
      });
      showFeedback('success', res.message || t.updatedSuccess);
      loadUsers(viewIndex);
      if (selectedUserLoginId === userLoginId) {
        loadUserDetail(userLoginId);
      }
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Durum güncellenemedi.');
    }
  };

  const handleUnlockUser = async (userLoginId: string) => {
    try {
      const res = await updateUserLoginStatusAdmin({
        userLoginId,
        unlock: 'Y'
      });
      showFeedback('success', res.message || 'Kullanıcı kilidi başarıyla açıldı.');
      loadUsers(viewIndex);
      if (selectedUserLoginId === userLoginId) {
        loadUserDetail(userLoginId);
      }
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Kilit açılamadı.');
    }
  };

  // ==========================================
  // Reset Password
  // ==========================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserLoginId || !resetNewPassword.trim() || !resetVerifyPassword.trim()) {
      showFeedback('error', 'Lütfen tüm şifre alanlarını doldurun.');
      return;
    }
    if (resetNewPassword !== resetVerifyPassword) {
      showFeedback('error', translations.auth.passwordMismatch);
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await adminResetUserPassword({
        userLoginId: selectedUserLoginId,
        newPassword: resetNewPassword.trim(),
        newPasswordVerify: resetVerifyPassword.trim()
      });
      showFeedback('success', res.message || t.resetPasswordSuccess);
      setShowResetPasswordForm(false);
      setResetNewPassword('');
      setResetVerifyPassword('');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Şifre sıfırlanamadı.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ==========================================
  // Assign / Remove Security Group from User
  // ==========================================
  const handleAddSecurityGroup = async () => {
    if (!selectedUserLoginId || !assignGroupId) return;
    setIsAssigningGroup(true);
    try {
      const res = await addUserSecurityGroup({
        userLoginId: selectedUserLoginId,
        groupId: assignGroupId
      });
      showFeedback('success', res.message || 'Yetki grubu atandı.');
      loadUserDetail(selectedUserLoginId);
      loadUsers(viewIndex);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Yetki grubu atanamadı.');
    } finally {
      setIsAssigningGroup(false);
    }
  };

  const handleRemoveSecurityGroup = async (groupId: string) => {
    if (!selectedUserLoginId) return;
    try {
      const res = await removeUserSecurityGroup({
        userLoginId: selectedUserLoginId,
        groupId
      });
      showFeedback('success', res.message || 'Yetki grubu kaldırıldı.');
      loadUserDetail(selectedUserLoginId);
      loadUsers(viewIndex);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Yetki grubu kaldırılamadı.');
    }
  };

  // ==========================================
  // Security Groups Tab Operations
  // ==========================================
  const loadSecurityGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetchSecurityGroups();
      setSecurityGroups(res.securityGroups || []);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Yetki grupları yüklenemedi.');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadGroupPermissions = useCallback(async (groupId: string) => {
    setLoadingGroupPermissions(true);
    try {
      const res = await fetchSecurityGroupPermissions(groupId);
      setGroupPermissionsDetail(res);
      setPermSearchQuery('');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Grup izinleri yüklenemedi.');
    } finally {
      setLoadingGroupPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'securityGroups') {
      loadSecurityGroups();
    }
  }, [activeTab, loadSecurityGroups]);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    loadGroupPermissions(groupId);
  };

  const handleAddPermission = async (permissionId: string) => {
    if (!selectedGroupId) return;
    setIsManagingPermission(true);
    try {
      const res = await addPermissionToSecurityGroup({
        groupId: selectedGroupId,
        permissionId
      });
      showFeedback('success', res.message || 'İzin başarıyla eklendi.');
      loadGroupPermissions(selectedGroupId);
      loadSecurityGroups();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'İzin eklenemedi.');
    } finally {
      setIsManagingPermission(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!selectedGroupId) return;
    setIsManagingPermission(true);
    try {
      const res = await removePermissionFromSecurityGroup({
        groupId: selectedGroupId,
        permissionId
      });
      showFeedback('success', res.message || 'İzin kaldırıldı.');
      loadGroupPermissions(selectedGroupId);
      loadSecurityGroups();
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'İzin kaldırılamadı.');
    } finally {
      setIsManagingPermission(false);
    }
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return securityGroups;
    const q = groupSearchQuery.toLowerCase();
    return securityGroups.filter(
      g => g.groupId.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
    );
  }, [securityGroups, groupSearchQuery]);

  // Filtered Group Assigned Permissions
  const filteredAssignedPerms = useMemo(() => {
    if (!groupPermissionsDetail) return [];
    if (!permSearchQuery.trim()) return groupPermissionsDetail.assignedPermissions;
    const q = permSearchQuery.toLowerCase();
    return groupPermissionsDetail.assignedPermissions.filter(
      p => p.permissionId.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [groupPermissionsDetail, permSearchQuery]);

  // Filtered Group Available Permissions
  const filteredAvailablePerms = useMemo(() => {
    if (!groupPermissionsDetail) return [];
    if (!permSearchQuery.trim()) return groupPermissionsDetail.availablePermissions;
    const q = permSearchQuery.toLowerCase();
    return groupPermissionsDetail.availablePermissions.filter(
      p => p.permissionId.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [groupPermissionsDetail, permSearchQuery]);

  // Filtered Role Types
  const filteredRoleTypes = useMemo(() => {
    if (!roleSearchQuery.trim()) return roleTypes;
    const q = roleSearchQuery.toLowerCase();
    return roleTypes.filter(
      rt =>
        rt.roleTypeId.toLowerCase().includes(q) ||
        rt.description.toLowerCase().includes(q) ||
        rt.parentTypeId.toLowerCase().includes(q)
    );
  }, [roleTypes, roleSearchQuery]);

  const totalPages = Math.ceil(totalCount / viewSize) || 1;

  return (
    <div className="space-y-6 animate-fadeIn selection:bg-indigo-500 selection:text-white">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-[90] p-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-slideIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950 border border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Top Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-4">
        <div className="ds-pill-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`ds-pill-tab ${activeTab === 'users' ? 'ds-pill-tab-active' : ''}`}
          >
            <Users size={15} />
            <span>{t.tabUsers}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('securityGroups')}
            className={`ds-pill-tab ${activeTab === 'securityGroups' ? 'ds-pill-tab-active' : ''}`}
          >
            <Shield size={15} />
            <span>{t.tabSecurityGroups}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {securityGroups.length || metadata.securityGroups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roleTypes')}
            className={`ds-pill-tab ${activeTab === 'roleTypes' ? 'ds-pill-tab-active' : ''}`}
          >
            <Network size={15} />
            <span>{t.tabRoleTypes}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {roleTypes.length}
            </span>
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => setIsCreateUserOpen(true)}
              className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t.createUser}</span>
            </button>
          )}
          {activeTab === 'securityGroups' && (
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t.createGroup}</span>
            </button>
          )}
          {activeTab === 'roleTypes' && (
            <button
              type="button"
              onClick={() => setIsCreateRoleTypeOpen(true)}
              className="ds-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t.createRoleType}</span>
            </button>
          )}
        </div>
      </div>


      {/* ========================================================================= */}
      {/* TAB 1: USERS LIST & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadUsers(0);
                }}
                className="relative flex-1"
              >
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </form>

              <button
                type="button"
                onClick={() => loadUsers(0)}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer shrink-0"
                title={common.refresh}
              >
                <RefreshCw size={15} className={loadingUsers ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { key: 'ALL', label: t.filterAll },
                  { key: 'ACTIVE', label: t.filterActive },
                  { key: 'DISABLED', label: t.filterDisabled },
                  { key: 'LOCKED', label: t.filterLocked },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {/* Group Dropdown Filter */}
              <div className="ml-2">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- {t.securityGroups}: {common.all} --</option>
                  {metadata.securityGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.groupId}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider">{t.userLoginId}</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider">{t.displayName}</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider">{t.securityGroups}</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider">{t.status}</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider text-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        <span>{common.loading}</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                        {t.noUsersFound}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelected = selectedUserLoginId === u.userLoginId;
                      return (
                        <tr
                          key={u.userLoginId}
                          onClick={() => handleSelectUser(u.userLoginId)}
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-950/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                                {u.userLoginId.charAt(0).toUpperCase()}
                              </div>
                              <span>{u.userLoginId}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-200">
                            <p className="font-medium text-white">{u.displayName}</p>
                            {u.partyId && <p className="text-[10px] text-slate-500 font-mono">{u.partyId}</p>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {u.securityGroups && u.securityGroups.length > 0 ? (
                                u.securityGroups.map((sg) => (
                                  <span
                                    key={sg.groupId}
                                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700/50"
                                  >
                                    {sg.groupId}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-600 italic">--</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {u.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Lock size={11} />
                                  <span>{t.locked}</span>
                                </span>
                              ) : u.enabled === 'Y' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <UserCheck size={11} />
                                  <span>{common.active}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                  <UserX size={11} />
                                  <span>{common.inactive}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {u.isLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockUser(u.userLoginId)}
                                  className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1"
                                  title={t.unlockAccount}
                                >
                                  <Unlock size={12} />
                                  <span>{t.unlockAccount}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u.userLoginId, u.enabled)}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  u.enabled === 'Y'
                                    ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
                                    : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                                }`}
                              >
                                {u.enabled === 'Y' ? t.deactivateAccount : t.activateAccount}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectUser(u.userLoginId)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                title={t.userDetail}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <span>
                {common.total}: <strong className="text-white font-mono">{totalCount}</strong> {t.tabUsers.toLowerCase()}
              </span>

              <div className="flex items-center gap-2">
                <span>
                  {common.page} {viewIndex + 1} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={viewIndex === 0 || loadingUsers}
                    onClick={() => loadUsers(viewIndex - 1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={viewIndex + 1 >= totalPages || loadingUsers}
                    onClick={() => loadUsers(viewIndex + 1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER DETAIL SIDE DRAWER */}
      {/* ========================================================================= */}
      {selectedUserLoginId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay backdrop */}
          <div className="fixed inset-0 bg-black/80 transition-opacity" onClick={handleCloseDrawer} />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-y-auto">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-red-600 to-amber-700 flex items-center justify-center font-bold text-white shadow-md text-sm ring-1 ring-white/10">
                    {selectedUserLoginId.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{selectedUserLoginId}</h3>
                    <p className="text-xs text-slate-400">{userDetail?.displayName || selectedUserLoginId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              {loadingUserDetail || !userDetail ? (
                <div className="p-12 text-center text-slate-500">
                  <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                  <span>{common.loading}</span>
                </div>
              ) : (
                <div className="p-5 space-y-6 flex-1">
                  {/* Account Status Card */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {t.accountSecurity}
                      </span>
                      {userDetail.isLocked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Lock size={10} /> {t.locked}
                        </span>
                      ) : userDetail.enabled === 'Y' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {common.active}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {common.inactive}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500">{t.failedLogins}:</span>
                        <p className="font-mono text-white mt-0.5">{userDetail.successiveFailedLogins}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">{t.requirePasswordChange}:</span>
                        <p className="font-mono text-white mt-0.5">{userDetail.requirePasswordChange === 'Y' ? common.yes : common.no}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      {userDetail.isLocked && (
                        <button
                          type="button"
                          onClick={() => handleUnlockUser(userDetail.userLoginId)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Unlock size={14} />
                          <span>{t.unlockAccount}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(userDetail.userLoginId, userDetail.enabled)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          userDetail.enabled === 'Y'
                            ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                      >
                        {userDetail.enabled === 'Y' ? t.deactivateAccount : t.activateAccount}
                      </button>
                    </div>
                  </div>

                  {/* Reset Password Form Section */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <Key size={15} className="text-indigo-400" />
                        <span>{t.resetPassword}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowResetPasswordForm(!showResetPasswordForm)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
                      >
                        {showResetPasswordForm ? common.cancel : 'Düzenle'}
                      </button>
                    </div>

                    {showResetPasswordForm && (
                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{t.password} *</label>
                          <input
                            type="password"
                            required
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="Yeni şifre"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{t.passwordVerify} *</label>
                          <input
                            type="password"
                            required
                            value={resetVerifyPassword}
                            onChange={(e) => setResetVerifyPassword(e.target.value)}
                            placeholder="Yeni şifre tekrar"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isResettingPassword}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isResettingPassword ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                          <span>{t.resetPassword}</span>
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Security Groups Management */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <Shield size={15} className="text-indigo-400" />
                        <span>{t.securityGroups}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {userDetail.securityGroups.filter((g) => g.isActive).length} aktif
                      </span>
                    </div>

                    {/* Add Group Form */}
                    <div className="flex items-center gap-2">
                      <select
                        value={assignGroupId}
                        onChange={(e) => setAssignGroupId(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- {t.selectGroup} --</option>
                        {metadata.securityGroups.map((g) => (
                          <option key={g.groupId} value={g.groupId}>
                            {g.groupId} - {g.description}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!assignGroupId || isAssigningGroup}
                        onClick={handleAddSecurityGroup}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0"
                      >
                        {isAssigningGroup ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        <span>{common.create}</span>
                      </button>
                    </div>

                    {/* Assigned Groups List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userDetail.securityGroups.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-lg">
                          Atanmış yetki grubu bulunmuyor.
                        </p>
                      ) : (
                        userDetail.securityGroups.map((g) => (
                          <div
                            key={g.groupId + (g.fromDate || '')}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              g.isActive
                                ? 'bg-slate-950/60 border-slate-800'
                                : 'bg-slate-950/20 border-slate-900 opacity-60'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-amber-300">{g.groupId}</span>
                                {g.isActive ? (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 rounded font-semibold">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                    Süresi Dolmuş
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{g.description}</p>
                            </div>

                            {g.isActive && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSecurityGroup(g.groupId)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                title={t.removeSecurityGroup}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Effective Permissions Preview */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>{t.permissionsTitle}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {userDetail.permissions.length} izin
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-36 overflow-y-auto flex flex-wrap gap-1">
                      {userDetail.permissions.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Doğrudan aktif izin bulunmuyor.</p>
                      ) : (
                        userDetail.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-800"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY GROUPS & PERMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'securityGroups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Security Groups List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Yetki grubu ara..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="ds-card divide-y divide-slate-800/60 max-h-[650px] overflow-y-auto">
              {loadingGroups ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                  <span>{common.loading}</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">Yetki grubu bulunamadı.</div>
              ) : (
                filteredGroups.map((g) => {
                  const isSelected = selectedGroupId === g.groupId;
                  return (
                    <button
                      key={g.groupId}
                      type="button"
                      onClick={() => handleSelectGroup(g.groupId)}
                      className={`w-full p-4 text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-l-4 border-indigo-500 pl-3'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{g.groupId}</span>
                          {['SUPER', 'FULLADMIN', 'REACT-APP_ADMIN'].includes(g.groupId) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {g.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {g.permissionCount} izin
                        </span>
                        <span className="text-slate-500">{g.userCount} kullanıcı</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Group Permissions Management Panel */}
          <div className="lg:col-span-7">
            {loadingGroupPermissions ? (
              <div className="ds-card p-12 text-center text-slate-500">
                <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                <span>{common.loading}</span>
              </div>
            ) : selectedGroupId && groupPermissionsDetail ? (
              <div className="ds-card p-5 space-y-5">
                {/* Panel Header */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white font-mono">{groupPermissionsDetail.groupInfo.groupId}</h3>
                        <p className="text-xs text-slate-400">{groupPermissionsDetail.groupInfo.description}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {groupPermissionsDetail.assignedPermissions.length} Aktif İzin
                    </span>
                  </div>
                </div>

                {/* Search in permissions */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    placeholder="İzin kodu veya açıklama filtrele..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Permissions Grid: Assigned vs Available Pool */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assigned Permissions */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                      {t.assignedPermissions} ({filteredAssignedPerms.length})
                    </span>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1.5 max-h-96 overflow-y-auto">
                      {filteredAssignedPerms.length === 0 ? (
                        <p className="text-xs text-slate-600 italic p-2">Atanmış izin bulunmuyor.</p>
                      ) : (
                        filteredAssignedPerms.map((p) => (
                          <div
                            key={p.permissionId}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-2 group hover:border-slate-700"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold text-white truncate">{p.permissionId}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                            </div>
                            <button
                              type="button"
                              disabled={isManagingPermission}
                              onClick={() => handleRemovePermission(p.permissionId)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer shrink-0"
                              title={t.removePermission}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Available Permissions Pool */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                      {t.availablePermissions} ({filteredAvailablePerms.length})
                    </span>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1.5 max-h-96 overflow-y-auto">
                      {filteredAvailablePerms.length === 0 ? (
                        <p className="text-xs text-slate-600 italic p-2">Eklenebilecek izin bulunmuyor.</p>
                      ) : (
                        filteredAvailablePerms.map((p) => (
                          <div
                            key={p.permissionId}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-2 group hover:border-indigo-500/40"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-medium text-slate-300 truncate">{p.permissionId}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{p.description}</p>
                            </div>
                            <button
                              type="button"
                              disabled={isManagingPermission}
                              onClick={() => handleAddPermission(p.permissionId)}
                              className="p-1 text-indigo-400 hover:text-indigo-300 rounded hover:bg-indigo-500/20 transition-colors cursor-pointer shrink-0"
                              title={t.addPermission}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ds-card p-12 text-center text-slate-500 space-y-3">
                <Shield size={36} className="mx-auto text-slate-600" />
                <p className="text-sm font-medium text-slate-400">İzinlerini görüntülemek ve yönetmek için bir yetki grubu seçin.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ROLE TYPES MANAGEMENT */}
      {/* ========================================================================= */}

      {activeTab === 'roleTypes' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  placeholder={t.searchRoleTypesPlaceholder}
                  className="ds-input pl-10 text-xs py-2"
                />
                {roleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRoleSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={loadRoleTypes}
                disabled={loadingRoleTypes}
                className="ds-btn-secondary p-2 text-slate-400 hover:text-white cursor-pointer"
                title={common.refresh}
              >
                <RefreshCw size={15} className={loadingRoleTypes ? 'animate-spin text-indigo-400' : ''} />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              {filteredRoleTypes.length} {t.tabRoleTypes.toLowerCase()}
            </div>
          </div>

          {/* Role Types Grid / Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3 font-semibold">{t.roleTypeCode}</th>
                    <th className="px-4 py-3 font-semibold">{t.roleTypeDescription}</th>
                    <th className="px-4 py-3 font-semibold">{t.parentRoleType}</th>
                    <th className="px-4 py-3 font-semibold text-center">{t.partyCount}</th>
                    <th className="px-4 py-3 font-semibold text-center">{t.hasTable}</th>
                    <th className="px-4 py-3 font-semibold text-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingRoleTypes ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto text-indigo-500 mb-2" />
                        <span>{common.loading}</span>
                      </td>
                    </tr>
                  ) : filteredRoleTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        <Network size={32} className="mx-auto text-slate-600 mb-2" />
                        <p>{t.noRoleTypesFound}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRoleTypes.map((rt) => (
                      <tr key={rt.roleTypeId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                            {rt.roleTypeId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">
                          {rt.description}
                        </td>
                        <td className="px-4 py-3">
                          {rt.parentTypeId ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <ChevronRight size={12} className="text-amber-400" />
                              <span>{rt.parentTypeId}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              {t.noParentRole}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                              rt.partyCount > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {rt.partyCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              rt.hasTable === 'Y'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {rt.hasTable === 'Y' ? common.yes : common.no}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={deletingRoleTypeId === rt.roleTypeId || rt.partyCount > 0}
                            onClick={() => handleDeleteRoleType(rt.roleTypeId)}
                            title={rt.partyCount > 0 ? 'Atanmış carisi olan rol silinemez' : common.delete}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {deletingRoleTypeId === rt.roleTypeId ? (
                              <Loader2 size={15} className="animate-spin text-rose-400" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreateUserOpen && (
        <CreateUserModal
          isOpen={isCreateUserOpen}
          onClose={() => setIsCreateUserOpen(false)}
          onSuccess={(newId) => {
            showFeedback('success', `${newId} ${t.createdSuccess}`);
            loadUsers(0);
          }}
        />
      )}

      {isCreateGroupOpen && (
        <CreateSecurityGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          onSuccess={(newGId) => {
            showFeedback('success', `${newGId} ${t.groupCreatedSuccess}`);
            loadSecurityGroups();
            handleSelectGroup(newGId);
          }}
        />
      )}

      {isCreateRoleTypeOpen && (
        <CreateRoleTypeModal
          isOpen={isCreateRoleTypeOpen}
          onClose={() => setIsCreateRoleTypeOpen(false)}
          existingRoleTypes={roleTypes}
          onSuccess={(newId) => {
            showFeedback('success', `${newId} ${t.roleTypeCreatedSuccess}`);
            loadRoleTypes();
          }}
        />
      )}
    </div>

  );
};

export default UserManagement;
