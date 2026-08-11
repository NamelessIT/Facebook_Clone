import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import userService from "../../services/userService";
import Avatar from "../common/Avatar";
import { LIMITS } from "../../shared/generated/constants";
import "./SearchBar.css";
import { useLocalization } from "../../contexts/useLocalization";
import toast from '../../shared/appToast';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const SearchBar = ({ onNavigate }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLocalization();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await userService.searchUsers(query, 1, 5);
        const users = res.data?.data || [];
        setSuggestions(users);
        setShowDropdown(users.length > 0);
      } catch (error) {
        setSuggestions([]);
        toast.apiError(error, t('search.loadFailed'), { id: "search-suggestions-error", context: "search.suggestions" });
      } finally {
        setLoading(false);
      }
    }, LIMITS.searchDebounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    onNavigate?.();
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div className="search-bar-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-bar-form">
        <Search size={18} className="search-bar-icon" />
        <input
          type="text"
          className="search-bar-input"
          placeholder={t('nav.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        />
        {query && (
          <button type="button" className="search-bar-clear" onClick={handleClear}>
            <X size={16} />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="search-bar-dropdown">
          {loading && <div className="search-bar-loading">{t('common.loading')}</div>}
          {suggestions.map((user) => (
            <div
              key={user.id}
              className="search-bar-suggestion"
              onClick={() => {
                setShowDropdown(false);
                navigate(`/search?q=${encodeURIComponent(user.fullName || query)}`);
                onNavigate?.();
              }}
            >
              <Avatar src={user.avatarUrl} className="w-8 h-8" />
              <span className="search-bar-suggestion-name">{user.fullName}</span>
            </div>
          ))}
          <div
            className="search-bar-suggestion search-bar-view-all"
            onClick={handleSubmit}
          >
            <Search size={16} />
            <span>{t('common.search')} &quot;{query}&quot;</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
