-- Optional title of a pot, shown on all its pages and in link previews, so people can tell pots apart.
ALTER TABLE pots ADD COLUMN title TEXT NOT NULL DEFAULT '';
