from abc import ABC, abstractmethod

from typing import AsyncIterator, Optional



from schemas.search import ResolvedSearchOptions



from .stream_events import ProviderStreamEvent

MAX_PROVIDER_OUTPUT_CHARS = 1_000_000





class BaseProvider(ABC):

    """BYOK provider adapter — complete + token stream with optional web search."""



    @abstractmethod

    async def complete(self, prompt: str, search: Optional[ResolvedSearchOptions] = None) -> str:

        ...



    async def stream_events(

        self,

        prompt: str,

        search: Optional[ResolvedSearchOptions] = None,

    ) -> AsyncIterator[ProviderStreamEvent]:

        """Default: single-chunk fallback when provider has no native stream."""

        text = await self.complete(prompt, search)

        yield ProviderStreamEvent(kind="token", text=text)



    async def stream(

        self,

        prompt: str,

        search: Optional[ResolvedSearchOptions] = None,

    ) -> AsyncIterator[str]:

        async for event in self.stream_events(prompt, search):

            if event.kind == "token" and event.text:

                yield event.text


