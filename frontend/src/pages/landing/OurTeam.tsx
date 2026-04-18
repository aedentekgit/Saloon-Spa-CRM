import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../components/landing/usePublicSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const BASE_URL = API_URL.replace('/api', '');

interface Branch {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Employee {
  _id: string;
  name: string;
  role: string;
  profilePic?: string;
  branch?: Branch | string;
  status: string;
}

function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.replace(/^\.?\/?/, '');
  return `${BASE_URL}/${clean}`;
}

function getBranchName(branch?: Branch | string): string {
  if (typeof branch === 'object') return branch?.name || 'Sanctuary';
  return 'Sanctuary';
}

function getInitials(name?: string): string {
  const value = (name || '').trim();
  if (!value) return 'ZT';

  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return initials.toUpperCase() || 'ZT';
}

function formatCount(value: number): string {
  return String(value).padStart(2, '0');
}



const TeamCardSkeleton = () => (
  <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(44,24,45,0.06)]">
    <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-zen-primary/10 via-white to-zen-primary/5" />
    <div className="space-y-4 p-6">
      <div className="h-3 w-24 rounded-full bg-zen-primary/10 animate-pulse" />
      <div className="h-8 w-3/4 rounded-full bg-zen-primary/10 animate-pulse" />
      <div className="h-4 w-1/2 rounded-full bg-zen-primary/10 animate-pulse" />
      <div className="h-4 w-full rounded-full bg-zen-primary/10 animate-pulse" />
    </div>
  </div>
);



const OurTeam = () => {
  const { settings } = usePublicSettings();
  const siteName = settings.general.siteName;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empRes, branchRes] = await Promise.all([
          fetch(`${API_URL}/employees/public`),
          fetch(`${API_URL}/branches/public`),
        ]);

        if (!empRes.ok || !branchRes.ok) {
          throw new Error('Failed to fetch registry');
        }

        const [empData, branchData] = await Promise.all([empRes.json(), branchRes.json()]);

        setEmployees(Array.isArray(empData) ? empData : []);
        setBranches(Array.isArray(branchData) ? branchData.filter((branch: Branch) => branch.isActive) : []);
      } catch (err) {
        setError('The team directory could not be loaded right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === 'Active'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return activeEmployees;

    return activeEmployees.filter((employee) => {
      const branchId = typeof employee.branch === 'object' ? employee.branch?._id : employee.branch;
      return branchId === selectedBranch;
    });
  }, [activeEmployees, selectedBranch]);

  const branchMap = useMemo(
    () => new Map(branches.map((branch) => [branch._id, branch])),
    [branches]
  );

  const selectedBranchLabel =
    selectedBranch === 'all'
      ? 'All sanctuaries'
      : branchMap.get(selectedBranch)?.name || 'Selected sanctuary';

  const featuredEmployee = filteredEmployees[0] ?? activeEmployees[0] ?? null;
  const featuredBranchName = featuredEmployee ? getBranchName(featuredEmployee.branch) : selectedBranchLabel;
  const uniqueRoles = useMemo(() => {
    return Array.from(
      new Set(filteredEmployees.map((employee) => employee.role?.trim() || 'Therapist'))
    );
  }, [filteredEmployees]);



  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(111,68,53,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(184,149,123,0.12),_transparent_25%),linear-gradient(180deg,_#fbf7f2_0%,_#ffffff_100%)] text-zen-primary">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-zen-primary/8 blur-3xl" />
        <div className="absolute top-1/3 right-[-10%] h-96 w-96 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-80 w-80 rounded-full bg-white/70 blur-3xl" />
      </div>

      {/* Filters & Roster */}
      <section className="px-6 lg:px-24 pt-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_16px_40px_rgba(44,24,45,0.06)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/45">
                  Branch filter
                </p>
                <p className="text-sm text-zen-primary/60">
                  Select a branch to focus the roster. The results update from the database in real time.
                </p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {loading ? (
                  <>
                    <div className="h-12 w-32 animate-pulse rounded-full bg-zen-primary/10" />
                    <div className="h-12 w-28 animate-pulse rounded-full bg-zen-primary/10" />
                    <div className="h-12 w-36 animate-pulse rounded-full bg-zen-primary/10" />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedBranch('all')}
                      className={`flex-shrink-0 rounded-full border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.28em] transition-all whitespace-nowrap ${
                        selectedBranch === 'all'
                          ? 'border-zen-primary bg-zen-primary text-white shadow-lg shadow-zen-primary/20'
                          : 'border-zen-primary/10 bg-white text-zen-primary/50 hover:border-zen-primary/20 hover:text-zen-primary'
                      }`}
                    >
                      All Branches
                    </button>
                    {branches.map((branch) => (
                      <button
                        key={branch._id}
                        onClick={() => setSelectedBranch(branch._id)}
                        className={`flex-shrink-0 rounded-full border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.28em] transition-all whitespace-nowrap ${
                          selectedBranch === branch._id
                            ? 'border-zen-primary bg-zen-primary text-white shadow-lg shadow-zen-primary/20'
                            : 'border-zen-primary/10 bg-white text-zen-primary/50 hover:border-zen-primary/20 hover:text-zen-primary'
                        }`}
                      >
                        {branch.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roster */}
      <section className="px-6 pb-24 pt-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <TeamCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[2rem] border border-red-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <h3 className="mt-6 text-2xl font-serif font-bold text-zen-primary">Unable to load the team</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zen-primary/60">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-zen-primary px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-transform hover:scale-[1.02]"
              >
                Retry
                <ArrowRight size={14} />
              </button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="rounded-[2rem] border border-white/70 bg-white p-10 text-center shadow-[0_20px_60px_rgba(44,24,45,0.06)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zen-primary/5 text-zen-brown">
                <Sparkles size={32} strokeWidth={1.25} />
              </div>
              <h3 className="mt-6 text-3xl font-serif font-bold text-zen-primary">
                No practitioners found in this branch
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zen-primary/60">
                Try another branch filter, or return to all branches to see the full roster.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className="inline-flex items-center gap-2 rounded-full bg-zen-primary px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-transform hover:scale-[1.02]"
                >
                  Show All Branches
                  <ArrowRight size={14} />
                </button>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-zen-primary/10 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown transition-colors hover:border-zen-primary/20 hover:bg-zen-primary/5"
                >
                  Contact Reception
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/45">
                    Practitioner roster
                  </p>
                  <h2 className="text-3xl font-serif font-bold text-zen-primary md:text-4xl">
                    Selected profiles
                  </h2>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-zen-primary/55 md:text-right">
                  Each profile is sourced from the employee database and presented in a cleaner, more
                  premium format so the public team page feels intentional and easy to scan.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredEmployees.map((staff) => {
                  const branchName = getBranchName(staff.branch);
                  const picUrl = getImageUrl(staff.profilePic);
                  const initials = getInitials(staff.name);

                  return (
                    <article
                      key={staff._id}
                      className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(44,24,45,0.08)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(44,24,45,0.12)]"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-zen-primary/5 to-white">
                        {picUrl ? (
                          <img
                            src={picUrl}
                            alt={staff.name}
                            className="h-full w-full object-cover grayscale-[0.12] transition-transform duration-1000 group-hover:scale-105 group-hover:grayscale-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}

                        <div
                          className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(111,68,53,0.15),_rgba(255,255,255,0.2))]"
                          style={{ display: picUrl ? 'none' : 'flex' }}
                        >
                          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zen-primary/10 bg-white/90 text-3xl font-serif font-bold text-zen-primary shadow-xl">
                            {initials}
                          </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90" />

                        <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-white backdrop-blur-xl">
                          <BadgeCheck size={10} className="mr-2 inline-block" />
                          Active
                        </div>

                        <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-white backdrop-blur-xl">
                          {staff.role || 'Therapist'}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">
                            <MapPin size={10} />
                            {branchName}
                          </p>
                          <h3 className="mt-3 text-3xl font-serif font-bold leading-tight">
                            {staff.name}
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-white/80">
                            Dedicated to consistent service, calm communication, and a polished guest
                            experience.
                          </p>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-primary/35">
                              Signature focus
                            </p>
                            <p className="mt-2 text-sm font-medium text-zen-primary">
                              {staff.role || 'Therapist'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} size={13} className="fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-zen-primary/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zen-brown">
                            <Award size={10} />
                            Team member
                          </span>
                          <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zen-brown transition-transform group-hover:translate-x-1"
                          >
                            Book a session
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[2.5rem] border border-zen-primary/10 bg-zen-primary text-white shadow-[0_30px_100px_rgba(44,24,45,0.15)]">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6 p-8 sm:p-10 lg:p-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/45">
                  Ready to book
                </p>
                <h2 className="max-w-2xl text-4xl font-serif font-bold leading-tight lg:text-5xl">
                  Choose a branch, meet the right specialist, and reserve your visit.
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-white/70 lg:text-base">
                  The public roster now stays connected to the backend, so your branch filter and team
                  selection always reflect the latest active records.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-primary transition-transform hover:scale-[1.02]"
                  >
                    Contact Reception
                    <ArrowRight size={14} />
                  </Link>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/65">
                    <Sparkles size={12} />
                    {siteName}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/5 p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <div className="space-y-5">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
                      Current view
                    </p>
                    <p className="mt-3 text-xl font-serif font-bold text-white">{selectedBranchLabel}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
                        Branches
                      </p>
                      <p className="mt-3 text-3xl font-serif font-bold text-white">{formatCount(branches.length)}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
                        Profiles
                      </p>
                      <p className="mt-3 text-3xl font-serif font-bold text-white">
                        {formatCount(filteredEmployees.length)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
                      <Award size={12} />
                      Service standard
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      The team roster uses one shared public data source, so the page stays consistent
                      across updates and branch changes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OurTeam;
