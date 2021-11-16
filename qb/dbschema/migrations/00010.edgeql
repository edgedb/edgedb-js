CREATE MIGRATION m1e7gcae4djx76fl5o333tigzmawxlmptwm5gfawt5sy5qtcadzkxa
    ONTO m1ztgis4vndditl3jigd34nyochlsxqctmt5rnh6jbp47jdrajpkaa
{
  CREATE TYPE default::Profile {
      CREATE PROPERTY plot_summary -> std::str;
  };
  ALTER TYPE default::Movie {
      CREATE LINK profile -> default::Profile {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY genre -> default::Genre;
  };
};
