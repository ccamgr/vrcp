package expo.modules.nativewebsocket.ws

import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.CoroutineContext
import okhttp3.Headers
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class PipelineSocket(
    private var url: String,
    private var headers: Map<String, String>,
): CoroutineScope {

    override val coroutineContext: CoroutineContext = Dispatchers.IO + SupervisorJob()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .dns(DnsHelper())
            .build()
    }

    private lateinit var socket: WebSocket
    private var shouldReconnect: Boolean = false

    interface SocketListener {
        fun onMessage(message: Any?)
    }

    private var socketListener: SocketListener? = null

    private val listener by lazy {
        object : WebSocketListener() {
            override fun onMessage(
                webSocket: WebSocket, text: String
            ) {
                val message = Gson().fromJson(text, Any::class.java)
                socketListener?.onMessage(message)
            }

            override fun onClosed(
                webSocket: WebSocket, code: Int, reason: String
            ) {
                 if (shouldReconnect)
                {
                    reconnect()
                }
            }

            override fun onFailure(
                webSocket: WebSocket, t: Throwable, response: Response?
            ) {
                if (shouldReconnect)
                {
                    reconnect()
                }
            }
        }
    }

    fun connect() {
        shouldReconnect = true


        val headerlist = Headers.Builder()

        headers.forEach { (key, value) ->
            headerlist.add(key, value)
        }

        val request = Request.Builder()
            .url(url = url)
            .headers(headers = headerlist.build())
            .build()

        socket = client.newWebSocket(request, listener)
    }

    fun reconnect() {
        launch {
            delay(Config.RECONNECTION_INTERVAL)
            api.auth.fetchToken()?.let { tkn ->
                token = tkn
                connect()
            }
        }
    }

    fun disconnect() {
        shouldReconnect = false
        socket.close(1000, null)
    }

    fun setListener(listener: SocketListener) {
        socketListener = listener
    }
}