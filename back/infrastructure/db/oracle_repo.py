from typing import Optional
try:
    from back.settings import settings  # type: ignore
except ModuleNotFoundError:
    from settings import settings  # type: ignore

try:
    import oracledb
except Exception:  # allow import-time failure in dev
    oracledb = None

class OracleRepo:
    def _connect(self):
        if not oracledb:
            raise RuntimeError("oracledb 드라이버가 없습니다.")
        if not all([settings.oracle_user, settings.oracle_password, settings.oracle_host, settings.oracle_service_name]):
            raise RuntimeError("Oracle 설정이 누락되었습니다(.env).")
        return oracledb.connect(
            user=settings.oracle_user,
            password=settings.oracle_password,
            host=settings.oracle_host,
            port=settings.oracle_port,
            service_name=settings.oracle_service_name,
        )

    def save_summary(self, *, file_id:str, filename:str, summary:str, category:str):
        try:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO summaries (id, filename, summary, category)
                VALUES (:1, :2, :3, :4)
                """, (file_id, filename, summary, category)
            )
            conn.commit()
        finally:
            try:
                cur.close(); conn.close()
            except Exception:
                pass

    def save_document(self, *, server_file_id:str, filename:str, title:str, size_bytes:int, summary_text: Optional[str]):
        try:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO documents (server_file_id, filename, title, size_bytes, summary_text)
                VALUES (:1, :2, :3, :4, :5)
                """, (server_file_id, filename, title, int(size_bytes), summary_text)
            )
            conn.commit()
        finally:
            try:
                cur.close(); conn.close()
            except Exception:
                pass
