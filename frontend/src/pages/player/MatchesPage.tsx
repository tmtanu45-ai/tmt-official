import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  X, 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MatchCard } from '../../components/matches';

interface Match {
  id: string;
  title: string;
  description: string | null;
  game_mode: string;
  map: string;
  team_size: string;
  max_teams: number | null;
  max_players: number | null;
  scheduled_at: string;
  registration_opens_at: string;
  registration_closes_at: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  credential_release_at: string | null;
  credential_expires_at: string | null;
  status: string;
  registration_count: number;
  created_at: string;
}

interface MatchesResponse {
  data: Match[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function MatchesPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'OPEN',
    game_mode: '',
    team_size: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['matches', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      const { data } = await api.get(`/matches?${params}`);
      return data as MatchesResponse;
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: 'OPEN', game_mode: '', team_size: '' });
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse h-64">
            <div className="h-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-400">Failed to load matches</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </Card>
    );
  }

  const matches = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Practice Matches</h1>
          <p className="text-ghost-gray mt-1">Find and register for upcoming Free Fire matches</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-field py-2 px-3 text-sm max-w-xs"
          >
            <option value="OPEN">Open for Registration</option>
            <option value="FULL">Full</option>
            <option value="CLOSED">Closed</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={filters.game_mode}
            onChange={(e) => handleFilterChange('game_mode', e.target.value)}
            className="input-field py-2 px-3 text-sm max-w-xs"
          >
            <option value="">All Game Modes</option>
            <option value="CLASSIC">Classic</option>
            <option value="RANKED">Ranked</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <select
            value={filters.team_size}
            onChange={(e) => handleFilterChange('team_size', e.target.value)}
            className="input-field py-2 px-3 text-sm max-w-xs"
          >
            <option value="">All Team Sizes</option>
            <option value="SOLO">Solo</option>
            <option value="DUO">Duo</option>
            <option value="SQUAD">Squad</option>
          </select>
          {(filters.game_mode || filters.team_size) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Matches Grid */}
      {matches.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-ghost-gray">
                Page {page} of {pagination.total_pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page === pagination.total_pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-ghost-gray">No matches found</p>
          <p className="text-ghost-gray text-sm mt-2">Try adjusting your filters</p>
        </Card>
      )}
    </div>
  );
}