CREATE MIGRATION m13m5xkrznccqnvocth4njrqz2rnipe5fhlrermlo56nvyp6kgrtuq
    ONTO m1u6lpszc2ef6z6zsx4ovnug42un3gfjmadwhjfm47du3ext3vpaoq
{
  ALTER TYPE default::Profile {
      CREATE PROPERTY slug -> std::str {
          SET readonly := true;
      };
  };
};
