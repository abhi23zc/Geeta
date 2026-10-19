package expo.modules.morningalarm

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/** Process-wide streaming cache, separate from verified user downloads. */
@UnstableApi
object MusicStreamCache {
  private var cache: SimpleCache? = null
  @Synchronized fun factory(context: Context, upstream: DataSource.Factory): DataSource.Factory {
    return runCatching {
      val shared = cache ?: SimpleCache(
        File(context.applicationContext.cacheDir, "music-stream-v1"),
        LeastRecentlyUsedCacheEvictor(128L * 1024 * 1024),
        StandaloneDatabaseProvider(context.applicationContext)
      ).also { cache = it }
      CacheDataSource.Factory().setCache(shared).setUpstreamDataSourceFactory(upstream)
        .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }.getOrElse { upstream }
  }
}
